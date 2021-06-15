import React, { useState } from 'react'

import Icon from '../../chrome/Icon'
import { TransformStep } from '../../qri/dataset'
import { NewRunStep, Run } from '../../qri/run'
import { Workflow } from '../../qrimatic/workflow'
import ScrollTrigger from '../scroller/ScrollTrigger'
import RunStatusIcon from '../run/RunStatusIcon'
import { RunMode } from './state/workflowState'
import DeployButtonWithStatusDescription from '../deploy/DeployStatusDescriptionButton'


export interface WorkflowOutlineProps {
  runMode: RunMode
  workflow?: Workflow
  run?: Run
}

const WorkflowOutline: React.FC<WorkflowOutlineProps> = ({
  runMode,
  workflow,
  run
}) => {
  const [showing, setShowing] = useState(true)

  if (!showing) {
    return (
      <div className='outline h-full w-10 flex flex-col py-4 pl-4'>
        <div className='opacity-20 cursor-pointer' onClick={() => { setShowing(!showing) }} ><Icon icon='arrowRight' /></div>
      </div>
    )
  }

  return (
    <div className='workflow-outline pr-7'>
      <div className='w-44 flex flex-col sticky top-20'>
        <div className='text-left'>
          <div className='text-qrigray-400 text-xs font-medium mb-4'>AUTOMATION OUTLINE</div>
          <div className='mb-2'>
            <ScrollTrigger target='triggers'>
              <div className='font-semibold text-qrinavy mb-1'>Triggers</div>
              <div className='mb-4'></div>
            </ScrollTrigger>
          </div>
          <div className='mb-2'>
            <ScrollTrigger target='script'>
              <div className='font-semibold text-qrinavy mb-2'>
                Script {(run && run.status === "running") && <div className='float-right text-blue-500'> <Icon icon='spinner' spin /></div>}
              </div>
            </ScrollTrigger>
          </div>
          <div className='mb-2'>
            {workflow && workflow.steps?.map((step: TransformStep, i: number) => {
              let r
              if (run) {
                r = (run?.steps && run?.steps.length >= i && run.steps[i]) ? run.steps[i] : NewRunStep({ status: "waiting" })
              }
              return (
                <ScrollTrigger target={step.name} key={i}>
                  <div className='text-sm mb-0.5 text-qrigray-400 capitalize'>
                    {step.name}
                    {r && <div className='float-right text-green-500'><RunStatusIcon state={r.status || "waiting"} /></div>}
                  </div>
                </ScrollTrigger>
              )
            })}
            {runMode === 'save' && <ScrollTrigger target='save'>
              <div className='text-sm ml-2 mb-1 text-gray-500 font-semibold'>
                <span className='font-black text-gray-500'>{((workflow && workflow.steps?.length) || 0)+1}</span> &nbsp; save
                {/* {r && <div className='float-right text-green-500'><RunStateIcon state={r.status || RunState.waiting} /></div>} */}
              </div>
            </ScrollTrigger>}
          </div>
          <ScrollTrigger target='on-completion'><div className='font-semibold text-qrinavy mb-2'>On Completion</div></ScrollTrigger>

          <div className="mb-20">
            {workflow && <DeployButtonWithStatusDescription workflow={workflow} />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowOutline
