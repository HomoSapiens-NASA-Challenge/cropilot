import { client } from "./generated/client.gen"

type ApiConfig = {
  /** Origin that serves `/api`. Empty string for same-origin requests. */
  baseUrl: string
  /** Returns the reader's handle, if any. It is sent as the bearer credential. */
  getToken: () => Promise<string | undefined>
}

/** Call once at startup, before the first request. */
export function configureApi({ baseUrl, getToken }: ApiConfig): void {
  client.setConfig({ baseUrl, auth: getToken })
}
