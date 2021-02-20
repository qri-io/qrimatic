package scheduler

import (
	"context"
	"fmt"
	"io"
	"sort"
	"sync"

	"github.com/qri-io/qri/event"
)

// ErrNotFound represents a lookup miss
var ErrNotFound = fmt.Errorf("not found")

// Store handles the persistence of Workflows and Runs. Store implementations
// must be safe for concurrent use
type Store interface {
	// Subscribe allows the store to listen for workflow events so it can properly
	// track and modify updated `Workflows`
	Subscribe(bus event.Bus)
	// ListWorkflows should return the set of workflows sorted in reverse-chronological
	// order (newest first order) of the last time they were run. When two LastRun
	// times are equal, Workflows should alpha sort the names
	// passing a limit of -1 and an offset of 0 returns the entire list of stored
	// workflows
	ListWorkflows(ctx context.Context, offset, limit int) ([]*Workflow, error)

	// ListWorkflowsByStatus should return set of Workflows, filtered by `Status`
	// and sorted by reverse chronological order by `LatestStart`. When two LatestStart
	// times are equal, Workflows hould alpha sort by name
	// passing a limit of -1 and an offset of 0 returns the entire list of the workflows
	// filtered by status
	ListWorkflowsByStatus(ctx context.Context, status string, offset, limit int) ([]*Workflow, error)

	ListRuns(ctx context.Context, offset, limit int) ([]*RunInfo, error)
	// GetWorkflowByName gets a workflow with the corresponding name field. usually matches
	// the dataset name
	GetWorkflowByName(ctx context.Context, name string) (*Workflow, error)
	// GetWorkflowByDatasetID gets a workflow with the corresponding datasetID field
	GetWorkflowByDatasetID(ctx context.Context, datasetID string) (*Workflow, error)
	// Workflow gets a workflow by it's identifier
	GetWorkflow(ctx context.Context, id string) (*Workflow, error)
	// PutWorkflow places a workflow in the store. Putting a workflow who's name already exists
	// must overwrite the previous workflow, making all workflow names unique
	PutWorkflow(context.Context, *Workflow) error
	// DeleteWorkflow removes a workflow from the store
	DeleteWorkflow(ctx context.Context, id string) error

	GetRun(ctx context.Context, id string) (*RunInfo, error)
	GetWorkflowRuns(ctx context.Context, workflowID string, offset, limit int) ([]*RunInfo, error)
	PutRun(ctx context.Context, r *RunInfo) error
	DeleteAllWorkflowRuns(ctx context.Context, workflowID string) error
}

// LogFileCreator is an interface for generating log files to write to,
// Stores should implement this interface
type LogFileCreator interface {
	// CreateLogFile returns a file to write output to
	CreateLogFile(workflow *Workflow) (f io.WriteCloser, path string, err error)
}

// MemStore is an in-memory implementation of the Store interface
// Workflows stored in MemStore can be persisted for the duration of a process
// at the longest.
// MemStore is safe for concurrent use
type MemStore struct {
	lock         sync.Mutex
	workflows    *WorkflowSet
	workflowRuns map[string]*RunSet
	runs         *RunSet
}

var _ Store = (*MemStore)(nil)

func NewMemStore(bus event.Bus) *MemStore {
	store := &MemStore{
		workflows:    NewWorkflowSet(),
		workflowRuns: map[string]*RunSet{},
		runs:         NewRunSet(),
	}
	store.Subscribe(bus)
	return store
}

func subscribe(s Store, bus event.Bus) {
	bus.SubscribeTypes(HandlerFromStore(s),
		ETWorkflowScheduled,
		ETWorkflowUnscheduled,
		ETWorkflowStarted,
		ETWorkflowCompleted,
		ETWorkflowUpdated,
	)
}

// HandlerFromStore returns an `event.Handler` that listens to all Workflow events
// and responds accordingly so that the store is always up to date
func HandlerFromStore(s Store) event.Handler {
	return func(ctx context.Context, e event.Event) error {
		switch e.Type {
		case ETWorkflowScheduled:
			return nil
		case ETWorkflowUnscheduled:
			return nil
		case ETWorkflowUpdated:
			return nil
		case ETWorkflowStarted:
			w, ok := e.Payload.(*Workflow)
			if !ok {
				log.Errorf("error expected event payload of %q to be of type %q", e.Type, "*Workflow")
			}
			log.Debugf("putting workflow %q with status %q into store", w.ID, w.Status)
			s.PutWorkflow(ctx, w)
		case ETWorkflowCompleted:
			w, ok := e.Payload.(*Workflow)
			if !ok {
				log.Errorf("error expected event payload of %q to be of type %q", e.Type, "*Workflow")
			}
			log.Debugf("putting workflow %q with status %q into store", w.ID, w.Status)
			s.PutWorkflow(ctx, w)
		default:
			log.Errorf("error unexpected event: %q", e.Type)
			return fmt.Errorf("error unexpected event: %q", e.Type)
		}
		return nil
	}
}

// Subscribe allows the store to subscribe to workflow events that allow
// the store to track and properly store updated `Workflows`
func (s *MemStore) Subscribe(bus event.Bus) {
	subscribe(s, bus)
}

// ListWorkflows lists workflows currently in the store
func (s *MemStore) ListWorkflows(ctx context.Context, offset, limit int) ([]*Workflow, error) {
	if limit < 0 {
		limit = len(s.workflows.set)
	}

	workflows := make([]*Workflow, 0, limit)
	for i, workflow := range s.workflows.set {
		if i < offset {
			continue
		} else if len(workflows) == limit {
			break
		}

		workflows = append(workflows, workflow)
	}
	return workflows, nil
}

// ListWorkflowsByStatus lists workflows filtered by status and ordered in reverse
// chronological order by `LatestStart`
func (s *MemStore) ListWorkflowsByStatus(ctx context.Context, status string, offset, limit int) ([]*Workflow, error) {
	workflows := make([]*Workflow, 0, len(s.workflows.set))

	for _, workflow := range s.workflows.set {
		if workflow.Status == status {
			log.Debugf("workflow %s has correct status", workflow.ID)
			workflows = append(workflows, workflow)
		}
	}

	if offset > len(workflows) {
		return []*Workflow{}, nil
	}

	sort.Slice(workflows, func(i, j int) bool {
		if workflows[j].LatestStart == nil {
			return false
		}
		if workflows[i].LatestStart == workflows[j].LatestStart {
			return workflows[i].Name < workflows[j].Name
		}
		return workflows[i].LatestStart.After(*(workflows[j].LatestStart))
	})

	if limit < 0 {
		limit = len(workflows)
	}

	if offset+limit > len(workflows) {
		return workflows[offset:], nil
	}

	return workflows[offset:limit], nil
}

func (s *MemStore) ListRuns(ctx context.Context, offset, limit int) ([]*RunInfo, error) {
	if limit < 0 {
		limit = len(s.runs.set)
	}

	runs := make([]*RunInfo, 0, limit)
	for i, workflow := range s.runs.set {
		if i < offset {
			continue
		} else if len(runs) == limit {
			break
		}

		runs = append(runs, workflow)
	}

	return runs, nil
}

// GetWorkflowByName gets a workflow with the corresponding name field. usually matches
// the dataset name
func (s *MemStore) GetWorkflowByName(ctx context.Context, name string) (*Workflow, error) {
	s.lock.Lock()
	defer s.lock.Unlock()

	for _, workflow := range s.workflows.set {
		if workflow.Name == name {
			return workflow.Copy(), nil
		}
	}
	return nil, ErrNotFound
}

// GetWorkflowByDatasetID gets a workflow with the corresponding datasetID field
func (s *MemStore) GetWorkflowByDatasetID(ctx context.Context, datasetID string) (*Workflow, error) {
	s.lock.Lock()
	defer s.lock.Unlock()
	for _, workflow := range s.workflows.set {
		if workflow.DatasetID == datasetID {
			return workflow.Copy(), nil
		}
	}
	return nil, ErrNotFound
}

// GetWorkflow gets workflow details from the store by dataset identifier
func (s *MemStore) GetWorkflow(ctx context.Context, id string) (*Workflow, error) {
	s.lock.Lock()
	defer s.lock.Unlock()

	for _, workflow := range s.workflows.set {
		if workflow.ID == id {
			return workflow.Copy(), nil
		}
	}
	return nil, ErrNotFound
}

// GetDatasetWorkflow gets workflow details from the store by dataset identifier
func (s *MemStore) GetDatasetWorkflow(ctx context.Context, datasetID string) (*Workflow, error) {
	s.lock.Lock()
	defer s.lock.Unlock()

	for _, workflow := range s.workflows.set {
		if workflow.DatasetID == datasetID {
			return workflow.Copy(), nil
		}
	}
	return nil, ErrNotFound
}

// PutWorkflow places a workflow in the store. If the workflow name matches the name of a workflow
// that already exists, it will be overwritten with the new workflow
func (s *MemStore) PutWorkflow(ctx context.Context, workflow *Workflow) error {
	if workflow.ID == "" {
		return fmt.Errorf("ID is required")
	}
	if workflow.DatasetID == "" {
		return fmt.Errorf("DatasetID is required")
	}

	s.lock.Lock()
	s.workflows.Add(workflow)
	s.lock.Unlock()

	if workflow.CurrentRun != nil {
		if err := s.PutRun(ctx, workflow.CurrentRun); err != nil {
			return err
		}
	}
	return nil
}

// DeleteWorkflow removes a workflow from the store by name. deleting a non-existent workflow
// won't return an error
func (s *MemStore) DeleteWorkflow(ctx context.Context, id string) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	if removed := s.workflows.Remove(id); removed {
		return nil
	}
	return ErrNotFound
}

// GetRun fetches a run by ID
func (s *MemStore) GetRun(ctx context.Context, id string) (*RunInfo, error) {
	s.lock.Lock()
	defer s.lock.Unlock()

	for _, r := range s.runs.set {
		if r.ID == id {
			return r.Copy(), nil
		}
	}
	return nil, ErrNotFound
}

func (s *MemStore) GetWorkflowRuns(ctx context.Context, workflowID string, offset, limit int) ([]*RunInfo, error) {
	runs, ok := s.workflowRuns[workflowID]
	if !ok {
		return nil, ErrNotFound
	}

	if limit < 0 {
		return runs.set[offset:], nil
	}

	res := make([]*RunInfo, 0, limit)
	for _, run := range runs.set {
		if offset > 0 {
			offset--
			continue
		}
		if len(res) == limit {
			return res, nil
		}
		res = append(res, run)
	}
	return res, nil
}

func (s *MemStore) PutRun(ctx context.Context, run *RunInfo) error {
	if run.ID == "" {
		return fmt.Errorf("ID is required")
	}
	if run.WorkflowID == "" {
		return fmt.Errorf("WorkflowID is required")
	}

	s.lock.Lock()
	defer s.lock.Unlock()
	if workflowRuns, ok := s.workflowRuns[run.WorkflowID]; ok {
		workflowRuns.Add(run)
	} else {
		workflowRuns = NewRunSet()
		workflowRuns.Add(run)
		s.workflowRuns[run.WorkflowID] = workflowRuns
	}
	s.runs.Add(run)
	return nil
}

func (s *MemStore) DeleteAllWorkflowRuns(ctx context.Context, workflowID string) error {
	return fmt.Errorf("not finished: MemStore delete all workflow runs")
}
