import * as request from "request";
const getLogger = require("log4js").getLogger;
import * as Datastore from "nedb";
const logger = getLogger();

// 1時間 (3600秒) あたり1000リクエスト = 1リクエスト最短3.6秒間隔まで許容されるのでそのようにwaitする

const WAIT = 4 * 1000;

export default class Requester {
    private cache = new Datastore({ filename: "cache.db", autoload: true });
    private lastRequestDate = new Date(0);

    async request(path: string) {
        let document: any = await new Promise((resolve, reject) => {
            this.cache.findOne({ path }, (err, document) => {
                if (err != null) {
                    reject(err);
                    return;
                }
                resolve(document);
            });
        });
        if (document != null) {
            return document.body;
        }
        let left = this.lastRequestDate.getTime() + WAIT - Date.now();
        if (left > 0) {
            logger.debug(`Wait ${left} ms`);
            await sleep(left);
        }
        this.lastRequestDate = new Date();
        let body = await new Promise<string>((resolve, reject) => {
            request(
                `https://qiita.com/api/v2${path}`,
                {
                    headers: {
                        "Authorization": `Bearer ${process.env.QIITA_ACCESS_TOKEN}`
                    }
                },
                (err, res, body) => {
                    logger.debug(`Requested ${path} statusCode=${res.statusCode}`);
                    if (err != null) {
                        reject(err);
                        return;
                    }
                    if (res.statusCode > 299) {
                        reject(new Error(`Request failed. statusCode: ${res}`));
                        return;
                    }
                    resolve(body);
                });
        });
        this.cache.insert({ path, body });
        return body;
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(() => resolve(), ms));
}
