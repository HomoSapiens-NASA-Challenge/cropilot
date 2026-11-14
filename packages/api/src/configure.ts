import { client } from "./generated/client.gen"

type ApiConfig = {
  /** Origin that serves `/api`. Empty string for same-origin requests. */
  baseUrl: string
  /** Returns the access token of the signed-in user, if any. */
  getToken: () => Promise<string | undefined>
}

/** Call once at startup, before the first request. */
export function configureApi({ baseUrl, getToken }: ApiConfig): void {
  client.setConfig({ baseUrl, auth: getToken })
}
