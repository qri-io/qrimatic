import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { WorkflowTrigger } from '../../qrimatic/workflow'

import { showModal } from '../app/state/appActions'
import { ModalType } from '../app/state/appState'
import ScrollAnchor from '../scroller/ScrollAnchor'
import Block from '../workflow/Block'
import CronTrigger from './CronTrigger'
import { CronTrigger as CronTriggerType } from '../../qrimatic/workflow'
import ContentBox from '../../chrome/ContentBox'
import Icon from '../../chrome/Icon'
import Button from '../../chrome/Button'
import WorkflowCellControlButton from "../workflow/WorkflowCellControlButton";

export interface WorkflowTriggersEditorProps {
  triggers?: WorkflowTrigger[]
}

export interface TriggerEditorProps {
  trigger: WorkflowTrigger
  onChange: (t: WorkflowTrigger) => void
}

const WorkflowTriggersEditor: React.FC<WorkflowTriggersEditorProps> = ({
  triggers = []
}) => {
  const dispatch = useDispatch()

  const [ showControls, setShowControls ] = useState(false);
  const [ createTrigger, setCreateTrigger ] = useState(false)

  const defaultCronTrigger: CronTriggerType = {
    type: 'cron',
    periodicity: 'R/2021-01-01T02:00:00.000Z/P1D',
    id: '',
    nextRunStart: ''
  }


  const handleAddClick = () => {
    setShowControls(false)
    setCreateTrigger(true)
  }

  let noTriggersWarning = ''
  if (triggers.length === 0 && !createTrigger) {
    noTriggersWarning = 'This workflow does not have any triggers defined.  Once deployed, it will only run when triggered manually.'
  }
  return (
    <div className='flex'>
      <div className='flex-grow min-w-0'>
        <ScrollAnchor id='triggers'/>
        <div className='flex'>
          <div className='flex-grow'>
            <h2 className='text-xl font-bold text-black mb-1'>Triggers</h2>
            <div className='text-sm text-qrigray-400 mb-3'>Customize your workflow to execute on a schedule, or based on other events</div>
          </div>
          {/*
            TODO(chriswhong): allow for adding other types of triggers.
            For now, we only allow one cron trigger so disable add when it exists
          */}
          {!createTrigger && triggers.length === 0 && (
            <div className='flex items-center'>
              <Button id='workflow_triggers_add_button' onClick={() => setShowControls(true)}>
                <Icon icon='plus' size='sm'/>
              </Button>
            </div>
          )}
        </div>

        <ContentBox className='mb-7' paddingClassName='p-2.5' warning={noTriggersWarning}>
          <div className='flex flex-wrap '>
            {triggers.map((trigger: WorkflowTrigger, i) => {
              switch (trigger.type) {
                case 'cron':
                  return <CronTrigger key={i} trigger={trigger} onCreateDelete={() => setCreateTrigger(false)} />
                default:
                  return <Block {...trigger} key={i} onClick={() => { dispatch(showModal(ModalType.schedulePicker))}} />
              }
            })}
            {createTrigger && <CronTrigger trigger={defaultCronTrigger} editMode={true} onCreateDelete={() => setCreateTrigger(false)}/>}
          </div>
        </ContentBox>
      </div>
      <div className='flex-shrink-0 w-48 ml-8 relative'>
        {showControls && <div onBlur={() => setShowControls(false)} className={'bg-white absolute -m-0.5 top-16 w-48 p-5 pt-2.5 rounded-md'}>
          <WorkflowCellControlButton onClick={handleAddClick} label={'Schedule'} icon={'calendar'}/>
          <WorkflowCellControlButton disabled={true} onClick={() => {}} label={'Webhook'} icon={'webHook'}/>
          <WorkflowCellControlButton disabled={true} onClick={() => {}} label={'Dataset'} icon={'dataset'}/>
        </div>}
      </div>
    </div>
  )
}

export default WorkflowTriggersEditor
