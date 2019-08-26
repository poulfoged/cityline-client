import EventTarget from "@ungap/event-target";

export class CitylineClient {
    private eventTarget = new EventTarget();
    private _frames: { [key: string]: Frame } = {};
    private _idCache = {};
    
    constructor(private url: string, private requestFactory: () => Promise<RequestInit> = () => Promise.resolve({})) {
        setTimeout(async () => {
            await this.startListener();   
        });
    }

    addEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions
    ) {
        return this.eventTarget.addEventListener(type, listener, options);
    }

    removeEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | EventListenerOptions
    ) {
        this.eventTarget.removeEventListener(type, listener, options);
    }

    async getFrames(... names: string[]) : Promise<any[]> {
        const promises = names.map(name => {
            if (this._frames[name]) 
                return Promise.resolve(this._frames[name]);
            
            return new Promise(r => {
                const handler = (event: CustomEvent<any>) => {
                    this.removeEventListener(name, handler);
                    r(event.detail);
                };
                this.addEventListener(name, handler);
            })
        });

        return await Promise.all(promises);
    }

    async getFrame<T>(name: string) : Promise<T> {
        if (this._frames[name])
            return this._frames[name].data;

        return new Promise<T>(r => {
            const handler = (event: CustomEvent<any>) => {
                this.removeEventListener(name, handler);
                r(event.detail);
            };
            this.addEventListener(name, handler);
        });        
    }

    private async buildRequest() : Promise<RequestInit> {
        const externalRequest = await this.requestFactory();
        const headers = new Headers(externalRequest.headers);
        headers.set("Content-Type", "application/json");
        
        const requestData: CitylineRequest = { tickets: this._idCache };
        const request: RequestInit = {
            ...externalRequest,
            ...{ body: JSON.stringify(requestData), method: "post", headers: headers }
        };
        
        return request;
    }

    private startListener = async () => {
        try {
            const decoder = new TextDecoder();
            const response = await fetch(this.url, await this.buildRequest());
            const reader = response.body.getReader();
            const buffer = new Buffer();

            while (true) {
                const result = await reader.read();

                if (result.done)
                    throw new Error("Stream should never complete");

                buffer.add(decoder.decode(result.value));
                
                while (buffer.hasTerminator()) {
                    const chunk = buffer.take();
                    const frame = this.parseFrame(chunk);
                    this.addFrame(frame);
                }
            }
        }
        catch(error) {
            this.eventTarget.dispatchEvent(new CustomEvent("error", { detail: error })); 
        }
        finally {
            setTimeout(this.startListener, 1000);
        }
    }

    private addFrame(frame: Frame) {
        if (frame && frame.event) {
            if (frame.id)
                this._idCache[frame.event] = frame.id;

            this._frames[frame.event] = frame;

            setTimeout(() => {
                this.eventTarget.dispatchEvent(                
                    new CustomEvent(frame.event, {
                        detail: frame.data
                    })
                );

                this.eventTarget.dispatchEvent(
                    new CustomEvent("frame-received", {
                        detail: frame
                    })
                );
            });
        }
    }
    
    private parseFrame(lines: string[]): Frame {
        const result = { data: undefined };
        lines.forEach(line => {
            const parts = line.split(": ");
            if (parts.length !== 2)
                return;

            switch (parts[0]) {
                case "data":
                    result[parts[0]] = JSON.parse(parts[1]);
                    break;
                default:
                    result[parts[0]] = parts[1].trim();
            }
        });
        return result;
    }
}

class Buffer {
    private _buffer = [];

    add(chunk: string) {
        this._buffer = this._buffer.concat(chunk.split("\n"));
    }

    hasTerminator() : boolean {
        return this._buffer.indexOf("") !== -1;
    }

    take() {
        const position = this._buffer.indexOf("");
        const chunk = this._buffer.slice(0, position);
        this._buffer = this._buffer.slice(position+1);  
        return chunk;
    }

    clear() {
        this._buffer.length = 0;
    }
}

interface CitylineRequest {
    tickets: { [key: string]: string };
}

export interface Frame {
    id?: string;
    event?: string;
    data: any;
}
