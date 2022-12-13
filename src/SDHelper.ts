import { SDClient } from "../mod.ts";
import type * as SDModels from './SDModels.ts';

export type ChangeModelResp = [
    {
        /**
         * model name formated as "name [hash]"
         */
        value: string,
        __type__: "update"
    },
    /**
     * default config as json string, type: SDModels.Options
     */
    string //'{"samples_save": true, "samples_format": "png", "samples_filename_pattern": "", "save_images_add_num...'
];

export interface PredictResponse<T> {
    data: T;
    is_generating: boolean;
    duration: number;
    average_duration: number;
}

export class SDHelper {
    public readonly session_hash;
    constructor(public readonly client: SDClient, session_hash?: string) {
        this.session_hash = session_hash || Math.random().toString(36).split('.')[1];
    }

    /**
     * MTD 115
     */
    async getHtml115(): Promise<PredictResponse<string>> {
        const { session_hash } = this;
        const resp = this.client.run.$('predict').$post({ fn_index: 115, session_hash, data: [] });
        const data2 = await resp as PredictResponse<[string]>;
        const html = data2.data[0] as string;

        const result: PredictResponse<string> = {
            average_duration: data2.average_duration,
            duration: data2.duration,
            is_generating: data2.is_generating,
            data: html,
        }
        return result;
    }



    /**
     * MTD 116
     * @param data Options object as return by the API, do not handcrarf it, the Object is filed order sensitif. 
     * @returns 
     */
    async setOptions(data: SDModels.Options): Promise<PredictResponse<{ opts: SDModels.Options, changes: number }>> {
        const { session_hash } = this;
        const resp = this.client.run.$('predict').$post({ fn_index: 116, session_hash, data: Object.values(data) });
        const data2 = await resp as PredictResponse<[string, string]>;
        const [optsStr, changesStr] = data2.data[1];
        const opts: SDModels.Options = JSON.parse(optsStr);
        const changes = Number(changesStr.replaceAll(/[^\d+]/g, ''));

        const result: PredictResponse<{ opts: SDModels.Options, changes: number }> = {
            average_duration: data2.average_duration,
            duration: data2.duration,
            is_generating: data2.is_generating,
            data: { opts, changes },
        }
        return result;
    }

    /**
     * MTD 117
     * @param client 
     * @param model 
     * @returns 
     */
    async changeModels(model: SDModels.SDModelItem): Promise<PredictResponse<{ value: string, options: SDModels.Options }>> {
        const { session_hash } = this;
        const resp = await this.client.run.$('predict').$post({ fn_index: 117, session_hash, data: [`${model.model_name} [${model.hash}]`] }) as PredictResponse<ChangeModelResp>;
        const { is_generating, duration, average_duration } = resp;
        const out = {
            is_generating, duration, average_duration, data: {
                value: resp.data[0].value,
                options: JSON.parse(resp.data[1]) as SDModels.Options,
            }
        }
        return out;
    }

    /**
     * MTD 118
     */
    getSetting(): Promise<Array<boolean | number | string>> {
        const { session_hash } = this;
        const resp = this.client.run.$('predict').$post({ fn_index: 118, session_hash, data: [] });
        return resp as Promise<Array<boolean | number | string>>;
    }

    /**
     * MTD 120 Extensions
     */
    async getHtml120(): Promise<PredictResponse<string>> {
        const { session_hash } = this;
        const resp = this.client.run.$('predict').$post({ fn_index: 120, session_hash, data: [] });
        const data2 = await resp as PredictResponse<[string]>;
        const html = data2.data[0] as string;

        const result: PredictResponse<string> = {
            average_duration: data2.average_duration,
            duration: data2.duration,
            is_generating: data2.is_generating,
            data: html,
        }
        return result;
    }




    getCurrentOptions(): Promise<SDModels.Options> {
        return this.client.sdapi.v1.options.$get()
    }

    async getModels(): Promise<{ selected: SDModels.SDModelItem | null, list: SDModels.SDModelItem[] }> {
        let selectHash = '';
        const options = await this.client.sdapi.v1.options.$get();
        const sd_model_checkpoint = options.sd_model_checkpoint || '';
        const m = sd_model_checkpoint?.match(/(.+) \[([a-f0-9]+)\]/);
        if (m) {
            selectHash = m[2];
        }
        const list = await this.client.sdapi.v1["sd-models"].$get();
        let selected: SDModels.SDModelItem | null = null;
        for (const model of list) {
            if (selectHash === model.hash) {
                selected = model;
            }
        }
        return { selected, list };
    }

}