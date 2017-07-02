import {RequestOptionsArgs} from '@angular/http';

export interface RestRequest {
    id?: number;
    method: string;
    url: string;
    options?: RequestOptionsArgs;
    body?: any;
}

export interface IdRestRequest extends RestRequest {
    id: number;
}

export const methods = {
    DELETE: "DELETE",
    GET: "GET",
    HEAD: "HEAD",
    OPTIONS: "OPTIONS",
    PATCH: "PATCH",
    POST: "POST",
    PUT: "PUT",
    REQUEST: "REQUEST"
}