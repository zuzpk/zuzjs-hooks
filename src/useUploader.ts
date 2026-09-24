"use client"
import { CancelTokenSource, getCancelToken, UploadProgressEvent, withPost, uuid } from "@zuzjs/core";
import { useRef } from "react";
import { dynamic } from "./types";

export enum Status {
    Error = -1,
    Idle = 0,
    FetchingServer = 1,
    Uploading = 2,
    Saving = 3,
    Saved = 4,
}

export interface QueItem {
    ID: string,
    file: File,
    dir: string,
    remote: false,
    progress: number,
    speed: number,
    eta: number,
    bytes: number,
    status: Status,
    server?: Server | null,
}

export type Server = {
    ID: string,
    uri: string,
    token: string,
    rmf: string | null
}

export type Uploadify = {
    que: QueItem[],
    index: number,
    speed: number,
    stamp: number | null,
    token: string | null,
    status: Status,
    cancelToken?: CancelTokenSource | null
}

export interface Uploader {
    apiUrl: string,
    onChange?: (file: QueItem | null) => void,
    onComplete?: (index: number, que: QueItem[], currentFile: QueItem | null) => void,
    onError?: (index: number, que: QueItem[], currentFile: QueItem | null) => void,
    onQueFinished?: () => void,
}

const useUploader = (conf: Uploader) => {

    const { 
        apiUrl,
        onChange, onQueFinished } = conf;

    const self = useRef<Uploadify>({
        que: [],
        index: -1,
        speed: 0,
        stamp: null,
        token: null,
        status: Status.Idle
    })

    const sync = () => onChange?.(currentFile())

    const importFile = () => {}

    const uploadFile = () => {
        self.current.stamp = Date.now()
        const file = currentFile()
        const formData = new FormData()
        formData.append("ID", file.ID);
		formData.append("dir", file.dir);
		formData.append("server", file.server!.ID);
		formData.append("token", file.server!.token);
		formData.append('file', file.file);
		formData.append('fs', file.file.size.toString());
		self.current.cancelToken = getCancelToken()

        withPost(
            `${self.current.que[self.current.index].server!.uri}/receive`,
            formData,
            86400,
            true,
            undefined,
            (ev: UploadProgressEvent) => {
                self.current.que[self.current.index].status = Status.Uploading
                onChange?.({ ...currentFile(), progress: (ev.progress || 0) })
            }
        )
        .then(resp => {
            // console.log(`Uploaded`, resp)
            self.current.que[self.current.index].progress = 1
            self.current.que[self.current.index].status = Status.Saved
            self.current.status = Status.Idle
            sync()
            Que()
        })
        .catch(err => {
            // console.error(`UploadFailed`, err)
            self.current.que[self.current.index].status = Status.Error
            self.current.status = Status.Idle
            sync()
            Que()
        })
    }

    const getServer = (force: boolean) => {
        
        self.current.que[self.current.index].status = Status.FetchingServer
        sync()

        withPost<{
            kind: string,
            server: Server,
        }>(
            `${apiUrl}get_server`,
            { size: currentFile().file.size }
        )
        .then((resp) => {
            self.current.que[self.current.index].server = resp.server;
            self.current.que[self.current.index].status = Status.Uploading;
            sync()
            uploadFile();
        })
        .catch((err) => {
            self.current.que[self.current.index].status = Status.Error
            self.current.status = Status.Idle
            sync()
            Que()
        })
    }

    const currentFile = () : QueItem => self.current.que[self.current.index]

    const getQue = () : QueItem[] => self.current.que;

    const Que = () => {
        if( 
            self.current.status == Status.Idle && 
            (self.current.que.length - 1) > self.current.index 
        ){

            self.current.status = Status.Uploading
            self.current.index++
            self.current.que[self.current.index].status = Status.Uploading
            sync()
            if ( self.current.que[self.current.index].remote ) importFile()
            else getServer(true);
            
        }
        else onQueFinished?.()
    }

    const addToQue = (f: dynamic) => {
        self.current.que.push({
            ID: uuid(12),
            file: f.file as File,
            dir: f.dir,
            remote: f.remote,
            progress: 0,
            speed: 0,
            eta: 0,
            bytes: 0,
            status: Status.Idle,
            server: null
        });
        Que()
    }

    return {
        get: () => self,
        getQue,
        addToQue,
    };

}

export default useUploader;