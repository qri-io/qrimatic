import { Dispatch, AnyAction, Store } from 'redux'

import { QriRef } from '../../../qri/ref'
import { NewEventLogLine } from '../../../qri/eventLog'
import { RootState } from '../../../store/store'
import { trackVersionTransfer, completeVersionTransfer, removeVersionTransfer } from '../../transfer/state/transferActions'
import { runEventLog } from '../../workflow/state/workflowActions'
import { workflowCompleted, workflowStarted } from '../../collection/state/collectionActions'
import { deployStarted, deployStopped } from '../../deploy/state/deployActions'
import {
  ETCreatedNewFile,
  ETModifiedFile,
  ETDeletedFile,
  ETRemoteClientPushVersionProgress,
  ETRemoteClientPushVersionCompleted,
  // ETRemoteClientPushDatasetCompleted,
  ETRemoteClientPullVersionProgress,
  ETRemoteClientPullVersionCompleted,
  // ETRemoteClientPullDatasetCompleted,
  ETRemoteClientRemoveDatasetCompleted,
  ETWorkflowStarted,
  ETWorkflowCompleted,
  ETWorklowDeployStarted,
  ETWorklowDeployStopped,
} from '../../../qri/events'
import { wsConnectionChange } from '../state/websocketActions'
import { WS_CONNECT, WS_DISCONNECT } from '../state/websocketState'
import { WebsocketState, NewWebsocketState, WSConnectionStatus } from '../state/websocketState';

type DagCompletion = number[]

type RemoteEventType =
  | 'push-version'
  | 'pull-version'

export interface RemoteEvent {
  ref: QriRef
  remoteAddr: string
  progress: DagCompletion
  type: RemoteEventType
  complete?: boolean
}

export type RemoteEvents = Record<string, RemoteEvent>

const WEBSOCKETS_URL = process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:2503'
const WEBSOCKETS_PROTOCOL = 'qri-websocket'
const numReconnectAttempts = 2
const msToAddBeforeReconnectAttempt = 3000

function newReconnectDeadline(): Date {
  let d = new Date()
  d.setSeconds(d.getSeconds() + msToAddBeforeReconnectAttempt)
  return d
}

const middleware = () => {
  let socket: WebSocket | undefined
  let state: WebsocketState = {
    status: WSConnectionStatus.disconnected,
  }

  const onOpen = (dispatch: Dispatch ) => (event: Event) => {
    state = {
      status: WSConnectionStatus.connected,
      reconnectAttemptsRemaining: 0,
      reconnectTime: undefined,
    }
    const stateCopy = NewWebsocketState(state.status)
    dispatch(wsConnectionChange(stateCopy))
  }

  const onClose = (dispatch: Dispatch) => (event: Event) => {
    // code 1006 is an "Abnormal Closure" where no close frame is sent. Happens
    // when there isn't a websocket host on the other end (aka: server down)
    // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
    if ((event as any).code === 1006) {
      // connection failed
      // TODO (b5): here we're re-setting the number of connection attempts to a
      // number greater than zero on every failed connection, resulting in a
      // never-ending loop of re-connect attempts every x milliseconds.
      // We should be letting this value drop to zero, and providing the user
      // with a "retry" button when 
      // (reconnectAttemptsRemaning === 0 && WSConnectionStatus === interuupted)
      state.reconnectAttemptsRemaining = numReconnectAttempts
    }

    reconnect(dispatch)
    const stateCopy = NewWebsocketState(state.status, state.reconnectAttemptsRemaining, state.reconnectTime)
    dispatch(wsConnectionChange(stateCopy))
  }

  const onMessage = (dispatch: Dispatch) => (e: MessageEvent) => {
    try {
      const event = JSON.parse(e.data)

      if (event.type.startsWith("tf:")) {
        dispatch(runEventLog(NewEventLogLine(event)))
        return
      }

      switch (event.type) {
        case ETCreatedNewFile:
        case ETModifiedFile:
        case ETDeletedFile:
          // const { workingDataset } = store.getState()
          // const { peername, name, status } = workingDataset
          // // if the websocket message Username and Dsname match the peername and
          // // dataset name of the dataset that is currently being viewed, fetch
          // // status
          // if (peername && name && peername === event.data.username && name === event.data.dsName && !workingDataset.isWriting && !workingDataset.isSaving) {
          //   const components = Object.keys(status)
          //   components.forEach((component: string) => {
          //     if (event.data.source === status[component].filepath) {
          //       const wsMtime = new Date(Date.parse(event.data.time))
          //       // if there is and mtime or if the ws mtime is older then the status mtime, don't refetch
          //       if (status[component].mtime && !(status[component].mtime < wsMtime)) return
          //       // if there is no mtime, or if the ws mtime is newer then the status mtime, fetch!
          //       fetchWorkingDatasetDetails(peername, name)(store.dispatch, store.getState)
          //       store.dispatch(resetMutationsDataset())
          //       store.dispatch(resetMutationsStatus())
          //     }
          //   })
          // }
          break
        case ETRemoteClientPushVersionProgress:
        case ETRemoteClientPullVersionProgress:
          event.data.type = event.type === ETRemoteClientPushVersionProgress ? "push-version" : "pull-version"
          dispatch(trackVersionTransfer(event.data))
          break
        // case ETRemoteClientPushDatasetCompleted:
        // case ETRemoteClientPullDatasetCompleted:
        case ETRemoteClientPushVersionCompleted:
        case ETRemoteClientPullVersionCompleted:
          event.data.type = event.type === ETRemoteClientPushVersionCompleted ? "push-version" : "pull-version"
          dispatch(completeVersionTransfer(event.data))
          break
        case ETRemoteClientRemoveDatasetCompleted:
          dispatch(removeVersionTransfer(event.data))
          break
        case ETWorklowDeployStarted:
          dispatch(deployStarted(event.data))
          break
        case ETWorklowDeployStopped:
          dispatch(deployStopped(event.data))
          break
        case ETWorkflowStarted:
          dispatch(workflowStarted(event.data))
          break
        case ETWorkflowCompleted:
          dispatch(workflowCompleted(event.data))
          break
        default:
          // console.log(`received websocket event: ${event.type}`)
      }
    } catch (e) {
      // TODO(b5): handle this error!
      console.log(`error parsing websocket message: ${e}`)
    }
  }

  const connect = (dispatch: Dispatch) => {
    if (socket !== undefined) {
      socket.close()
    }
    // connect to the remote host
    socket = new WebSocket(WEBSOCKETS_URL, WEBSOCKETS_PROTOCOL)
    socket.onmessage = onMessage(dispatch)
    socket.onclose = onClose(dispatch)
    socket.onopen = onOpen(dispatch)
  }

  const reconnect = (dispatch: Dispatch) => {
    if (state.reconnectAttemptsRemaining && state.reconnectAttemptsRemaining > 0) {
      state = {
        status: WSConnectionStatus.interrupted,
        reconnectAttemptsRemaining: state.reconnectAttemptsRemaining - 1,
        reconnectTime: newReconnectDeadline()
      }
      setTimeout(() => {
        connect(dispatch)
      }, msToAddBeforeReconnectAttempt)
      return
    }

    // no reconnect attempts remaining, we're just disconnected
    state = {
      status: WSConnectionStatus.disconnected,
    }
  }

  // middleware
  return (store: Store<RootState>) => (next: Dispatch<AnyAction>) => (action: AnyAction) => {
    switch (action.type) {
      case WS_CONNECT:
        connect(next)
        break
      case WS_DISCONNECT:
        if (socket !== undefined) {
          socket.close()
        }
        socket = undefined
        break
    }

    return next(action)
  }
}

export const websocketMiddleware = middleware()
