import EventTarget from "@ungap/event-target";

export class CitylineClient {
    private eventTarget = new EventTarget();
    private _frames: { [key: string]: Frame } = {};
    private _idCache = {};
    public static terminator = String.fromCharCode(13);
    private parseFrame = (line: string): Frame => {
        const frame = JSON.parse(line) as Frame;

        if (frame.data)
            frame.data = JSON.parse(frame.data);

        return frame;
    };
    
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
            const started = new Date().getTime();

            if (!response.ok) 
                throw new Error(response.statusText);
                
            while (true) {
                const result = await reader.read();

                if (result.done)
                    break;

                // all is good, lets reset cooldown
                this.backawayCooldownSeconds = 0;

                const decoded = decoder.decode(result.value); 
                buffer.add(decoded);

                let chunk = undefined;
                do { 
                    chunk = buffer.take();

                    if (chunk !== undefined) {
                        const frame = this.parseFrame(chunk);
                        this.addFrame(frame);
                    }
                    
                } while (chunk !== undefined);
            }

            const timeSpent =  new Date().getTime() - started;
            // this is normal scenario - if we actually spent time chrunching data we can start quick again
            if (timeSpent < 5000)
                throw new Error("Loop ended too quickly, expects atleast 5 seconds");

            setTimeout(this.startListener, 100);
        }
        catch(error) {
            this.eventTarget.dispatchEvent(new CustomEvent("error", { detail: error })); 
            setTimeout(this.startListener, 1000 * this.backawayCooldownSeconds++);
        }
        finally {
            
        }
    }

    private backawayCooldownSeconds = 0;

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
    
    

}

class Buffer {
    private _buffer = [""];

    add(chunk: string) {
        const lines = chunk.split("\n");
        
        if (lines.length > 0)
            this._buffer[this._buffer.length-1] += lines[0];

        if (lines.length > 1)
            this._buffer = this._buffer.concat(lines.slice(1));
    }

    take() {
        if (this._buffer.length === 0)
            return undefined;

        if ((this._buffer[0].trim().startsWith("{") && this._buffer[0].trim().endsWith("}"))) {
            const chunk = this._buffer[0];
            this._buffer = this._buffer.slice(1);
            return chunk;
        }

        return undefined;
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
