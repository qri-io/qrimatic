// All dataset routes share DatasetWrapper, which handles the rendering of the
// dataset menu and fetches dsPreview (the latest version of the dataset)
// All routes use dsPreview to render the dataset header, so it is always needed
// regardless of th other dataset content being displayed

// DatasetPreviewPage fetches the other necessary parts of the preview (body + readme)

import React, {useEffect} from 'react'
import { Redirect, Route, Switch, useParams, useRouteMatch } from 'react-router'
import { useDispatch } from "react-redux";

import WorkflowPage from '../workflow/WorkflowPage'
import DatasetComponents from '../dsComponents/DatasetComponents'
import DatasetActivityFeed from '../activityFeed/DatasetActivityFeed'
import DatasetPreviewPage from '../dsPreview/DatasetPreviewPage'
import DatasetIssues from '../issues/DatasetIssues'
import { newQriRef } from '../../qri/ref'
import DatasetEditor from '../dsComponents/DatasetEditor'
import DatasetWrapper from '../dsComponents/DatasetWrapper'
import { loadHeader } from "./state/datasetActions";

const DatasetRoutes: React.FC<{}> = () => {
  const { url } = useRouteMatch()
  // TODO(b5): this qriRef is missing all params after /:username/:name b/c
  // params are dictated by the route that loaded this component.
  // This ref can only be used to load HEAD because DatasetRoutes defines
  // params like :fs and :hash, which are used to construct a commit-specific
  // ref. Move all ref constructino into container components to avoid potential
  // bugs
  const qriRef = newQriRef(useParams())
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(loadHeader(qriRef))
  },[dispatch, qriRef.username, qriRef.name, qriRef.path]);

  return (
    <DatasetWrapper>
      <Switch>
        <Route path='/ds/:username/:name' exact>
          <Redirect to={`${url}/preview`} />
        </Route>

        <Route path='/ds/:username/:name/workflow'>
          <WorkflowPage qriRef={qriRef} />
        </Route>

        <Route path='/ds/:username/:name/history'>
          <DatasetActivityFeed qriRef={qriRef} />
        </Route>

        <Route path='/ds/:username/:name/preview' exact>
          <DatasetPreviewPage qriRef={qriRef} />
        </Route>

        {process.env.REACT_APP_FEATURE_WIREFRAMES &&
          <Route path='/ds/:username/:name/issues'>
            <DatasetIssues qriRef={qriRef} />
          </Route>
        }

        {process.env.REACT_APP_FEATURE_WIREFRAMES &&
          <Route path='/ds/:username/:name/edit'>
            <DatasetEditor />
          </Route>
        }

        <Route path='/ds/:username/:name/at/:fs/:hash/components'>
          <Redirect to={`/ds/${qriRef.username}/${qriRef.name}/at/${qriRef.path}/body`} />
        </Route>

        <Route path='/ds/:username/:name/at/:fs/:hash/:component'>
          <DatasetComponents />
        </Route>

        <Route path='/ds/:username/:name/components'>
          <Redirect to={`/ds/${qriRef.username}/${qriRef.name}/body`} />
        </Route>

        <Route path='/ds/:username/:name/:component'>
          <DatasetComponents />
        </Route>
      </Switch>
    </DatasetWrapper>
  )
}

export default DatasetRoutes
