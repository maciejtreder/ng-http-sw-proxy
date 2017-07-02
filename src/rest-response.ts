export interface RestResponse {
    id?: number,
    type: string,
    bodyUsed: boolean,
    headers: string,
    ok: boolean,
    status: number,
    statusText: string,
    url: string,
    body?: any;
}