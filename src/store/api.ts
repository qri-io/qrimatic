import { Middleware, Dispatch, AnyAction } from 'redux'
import { ThunkDispatch } from 'redux-thunk'
import jwtDecode from 'jwt-decode'
import { toast } from 'react-toastify'

import { RootState } from './store'
import mapError from './mapError'
import { QriRef } from '../qri/ref'
import { selectSessionTokens } from '../features/session/state/sessionState'
import { APP_EXEC_MODE } from '..'
import { ExecutionMode } from '../execution/execution'

// CALL_API is a global, unique constant for passing actions to API middleware
export const CALL_API = Symbol('CALL_API')

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:2503'

// API_BASE_CLOUD_URL is only used if we are NOT in `ExecutionMode.CLOUD`
// TODO(ramfox): hack - eventually the cloud endpoints will be routed
// through qri core, until then we need to check for possible fetch to
// the cloud endpoints, and use this endpoint instead
export const API_BASE_CLOUD_URL = process.env.REACT_APP_API_BASE_CLOUD_URL || 'https://rosebud-api.qri.cloud'

export interface ApiErr {
  code?: number
  message: string
}

export function NewApiErr (): ApiErr {
  return {
    message: ''
  }
}

// ApiAction is an action that api middleware will operate on. ApiAction
// intentionally does _not_ extend Action. when api middleware encounters an
// ApiAction, it will immideately fire a API_[endpoint]_REQUEST action and
// either API_[ENDPOINT]_SUCCESS or API_[ENDPOINT]_FAILURE on request completion
export interface ApiAction extends AnyAction {
  // All ApiAction details are specified under the CALL_API symbol key
  [CALL_API]: {
    // endpoint is the api endpoint to call
    endpoint: string
    // method is the HTTP method used
    method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'OPTIONS'
    // segments is a list of parameters used to construct the API request
    segments?: QriRef
    // query is an object of query parameters to be appended to the API call URL
    query?: ApiQuery
    // body is the JSON body for POST requests
    body?: object|[]
    // form is the form data for POST requests (overrides body)
    // deprecated: form will be removed, don't add callers that populate form
    form?: object
    // pageInfo is the pagination information
    pageInfo?: ApiPagination
    // map is a function
    // map defaults to the identity function
    map?: (data: any) => any
    // token is a json web token.  It is normally read from state, but can also be passed in
    token?: string
    // local identifier for the request (useful for attaching a dataset ref),
    // not sent to server
    requestID?: string
  }
}

// identityFunc is a function that returns the argument it's passed
const identityFunc = <T>(a: T): T => a

export function apiActionTypes (endpoint: string): [string, string, string] {
  const name = endpoint.toUpperCase()
  return [`API_${name}_REQUEST`, `API_${name}_SUCCESS`, `API_${name}_FAILURE`]
}

export const ACTION_REQUEST = 'request'
export const ACTION_SUCCESS = 'success'
export const ACTION_FAILURE = 'failure'

export const getActionType = (action = { type: '' }): string => {
  if (action.type.endsWith('REQUEST')) return ACTION_REQUEST
  if (action.type.endsWith('SUCCESS')) return ACTION_SUCCESS
  if (action.type.endsWith('FAILURE')) return ACTION_FAILURE
  return ''
}

export function isApiAction (action = { type: '' }): boolean {
  return !!action.type && action.type.startsWith('API')
}

interface ApiPagination {
  page: number
  pageSize: number
}
interface ApiQuery {
  [key: string]: string
}

// ApiError is an interface for holding
// information about an ApiError
interface ApiError {
  // HTTP response code
  code: number
  // The error message returned from qri
  message?: string
}

// ApiResponseActions are emitted as side effects by api middleware. They come in type "success" and "failure" variations
// a type "failure" will have an ApiError as it's payload
export interface ApiResponseAction {
  type: string
  payload: Record<string, any>
}

// ApiActionThunk is the return value of an Api action.
// All api actions must return a promise that will be called with their result:
// either a SUCCESS or FAILURE action. This allows callers to chain
// .then(action) to perform additional work after an API call has completed
export type ApiActionThunk = (
  dispatch: ThunkDispatch<any, any, any>,
  getState?: () => RootState
) => Promise<AnyAction>

// chainSuccess wires together successive ApiActions in a ThunkAction.
// call it with dispatch & getState to get a function that accepts actions,
// and chain it a .then() call off another api response
export function chainSuccess (
  dispatch: ThunkDispatch<any, any, any>,
  getState: () => RootState) {
  return (thunk: ApiActionThunk) => {
    return async (action: AnyAction) => {
      if (getActionType(action) === 'success') {
        return await thunk(dispatch, getState)
      }
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw action
    }
  }
}

// APIResponseEnvelope is interface all API responses conform to
interface APIResponseEnvelope {
  meta: object
  data: object|any[]
  pagination?: object
}

// getJSON fetches json data from a url
async function getJSON<T> (url: string, options: FetchOptions): Promise<T> {
  const r = await fetch(url, options)
  const res = await r.json()
  if (res.meta.code !== 200) {
    let err: ApiError = { code: res.meta.code, message: mapError(res.meta.error) }
    toast.error(`❌ ${err.message}`)
    throw err // eslint-disable-line
  }
  return res as T
}

function apiUrl (endpoint: string, segments?: QriRef, query?: ApiQuery, pageInfo?: ApiPagination): [string, string] {
  const addToUrl = (url: string, seg: string): string => {
    if (!(url[url.length - 1] === '/' || seg[0] === '/')) url += '/'
    return url + seg
  }

  let url = API_BASE_URL + `/${endpoint}`

  // TODO (ramfox): hack - eventually the cloud endpoints will be routed through
  // the core registry endpoints & we will pick up the registry url there. However,
  // until then, we must ensure we are fetching from the cloud url when fetching
  // from the identity endpoints in the DESKTOP or LOCAL execution modes
  if (isCloudEndpoint(endpoint) && APP_EXEC_MODE !== ExecutionMode.CLOUD) {
    url = API_BASE_CLOUD_URL + `/${endpoint}`
  }

  if (segments) {
    if (segments.username) {
      url = addToUrl(url, segments.username)
    }
    if (segments.name) {
      url = addToUrl(url, segments.name)
    }
    if (segments.profileId || segments.path) {
      url = addToUrl(url, 'at')
    }
    if (segments.profileId) {
      url = addToUrl(url, segments.profileId)
    }
    if (segments.path) {
      url = addToUrl(url, segments.path)
    }
    if (segments.selector) {
      url = addToUrl(url, segments.selector.join('/'))
    }
  }

  if (query) {
    Object.keys(query).forEach((key, index) => {
      url += index === 0 ? '?' : '&'
      url += `${key}=${query[key]}`
    })
  }

  if (pageInfo) {
    url += query ? '&' : '?'
    url += `page=${pageInfo.page}&pageSize=${pageInfo.pageSize}`
  }
  return [url, '']
}

interface FetchOptions {
  method: string
  headers: Record<string, string>
  body?: string | FormData
  form?: object
}

// getAPIJSON constructs an API url & fetches a JSON response
async function getAPIJSON<T> (
  endpoint: string,
  method: string,
  segments?: QriRef,
  query?: ApiQuery,
  pageInfo?: ApiPagination,
  body?: object|[],
  form?: Record<string, any>,
  token?: string
): Promise<T> {
  const [url, err] = apiUrl(endpoint, segments, query, pageInfo)
  if (err) {
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw err
  }
  const options: FetchOptions = {
    method,
    headers: {
      'Accept': 'application/json'
    }
  }

  if (body) {
    options.headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  // TODO(chriswhong): the API should always accept JSON bodies,
  // but in development we encounted some endpoints that want form data
  // form can be removed once the API no longer requires it
  // if form exists, build a FormData object and set it to options.body
  if (form) {
    const formData = new FormData()
    Object.keys(form).forEach((key) => { formData.append(key, form[key]) })
    options.body = formData
  }

  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  }

  return await getJSON(url, options)
}

export interface TokenClaims {
  sub: string
  exp: number
  iss: string
  aud: string
  cty: string
  username: string
  user_id: string
}

// apiMiddleware manages requests to the qri JSON API
export const apiMiddleware: Middleware = ({ dispatch, getState }) => (next: Dispatch<AnyAction>) => async (action: any): Promise<any> => {
  if (action[CALL_API]) {
    let data: APIResponseEnvelope
    let {
      endpoint = '',
      method,
      map = identityFunc,
      segments,
      query,
      body,
      pageInfo,
      form,
      token: tokenFromAction,
      requestID = ''
    } = action[CALL_API]
    const [REQ_TYPE, SUCC_TYPE, FAIL_TYPE] = apiActionTypes(action.type)

    const { token: tokenFromState, refreshToken } = selectSessionTokens(getState())

    // we still need a token from the action symbol for when the user first logs
    // in and we need to make an immediate call for user details
    let token = tokenFromAction || tokenFromState

    next({
      ...action,
      type: REQ_TYPE,
      pageInfo,
      token,
      segments
    })

    try {
      token = await maybeRefreshToken(token, refreshToken, dispatch)
      data = await getAPIJSON(endpoint, method, segments, query, pageInfo, body, form, token)
    } catch (err) {
      return next({
        ...action,
        type: FAIL_TYPE,
        payload: {
          requestID,
          err,
          request: {
            query,
            pageInfo,
            segments
          }
        }
      })
    }

    return next({
      ...action,
      type: SUCC_TYPE,
      payload: {
        requestID,
        data: map(data.data),
        request: {
          query,
          pageInfo,
          segments
        },
        pagination: data.pagination
      }
    })
  }

  return next(action)
}

// utility to auto refresh token
// TODO(chrishwong): if there are multiple simultaneous API calls, there will be
// multiple calls to refresh the token. We should add some handling to pause
// subsequent requests while the refresh is happening
export const maybeRefreshToken = async (token: string, refreshToken: string, dispatch: Dispatch<AnyAction>): Promise<any> => {
  try {
    if (token) {
      let decoded: TokenClaims = jwtDecode(token)
      let exp = decoded.exp
      let now = Math.floor(Date.now() / 1000) // in seconds
      if ((exp - now) < 300) { // we preemptively refresh up to 5 min early for smoother operation
        let res = await refreshSession(token, refreshToken)

        // fire an action to update the access token in state
        dispatch({
          type: 'SET_TOKEN',
          token: res.data.access_token
        })

        return await Promise.resolve(res.data.access_token)
      }
    }
  } catch (error: any) {
    console.log(`error refreshing token - ${error.message}`)
    // logOut immediately if there is any error parsing the token or refreshing
    dispatch({ type: 'LOGOUT_SUCCESS' })
    return await Promise.reject(error)
  }
  return await Promise.resolve(token)
}

// fetch a new token
const refreshSession = async (token: string, refreshToken: string): Promise<any> => {
  try {
    if (token !== undefined && refreshToken !== undefined) {
      const response: Record<string, any> = await getAPIJSON(
        'oauth/token',
        'POST',
        undefined,
        undefined,
        undefined,
        undefined,
        {
          grant_type: 'refresh_token',
          refresh_token: refreshToken
        },
        token
      )

      // Note: our API returns null when no data is present, which
      // has gross implication for default values on downstream functions
      // here we explictly override a null response with undefined
      if (response.data === null) {
        response.data = undefined
      }

      return await Promise.resolve(response)
    } else {
      return await Promise.reject(new Error('no token/refresh token present'))
    }
  } catch (error: any) {
    console.log(`error refreshing token - ${error.message}`)
    return await Promise.reject(error)
  }
}

// TODO(ramfox): isCloudEndpoint is a hack to ensure the endpoint is a cloud only
// endpoint. these endpoints will eventally be routed through core as
// registry endpoints. Until then, this hack ensure we catch the cloud
// specific endpoints and fetch from the correct place
function isCloudEndpoint (endpoint: string): boolean {
  return endpoint.includes('identity/') || endpoint.includes('dataset_summary') || endpoint.includes('follow')
}
