/// <reference path="../typings/main.d.ts" />
try { require("source-map-support").install(); } catch (e) { /* empty */ }
const configure = require("log4js").configure;
const logger = require("log4js").getLogger();
import Requester from "./requester";

configure({ appenders: [{ type: "console", layout: { type: "basic" } }] });

async function main() {
    let requester = new Requester();
    let list = [] as { url: string, strength: number }[];
    for (let i = 1; i <= 100; i++) {
        list = list.concat(await getStockStrengthList(requester, i));
        logger.info("Current top", list.sort((a, b) => -(a.strength - b.strength))[0]);
    }
    let sorted = list
        .sort((a, b) => -(a.strength - b.strength));
    logger.info(sorted.slice(0, 10));
}

async function getStockStrengthList(requester: Requester, page: number) {
    let items = JSON.parse(await requester.request(`/items?page=${page}&per_page=100`)) as any[];
    logger.info(`Get ${items.length} users.`);
    let list = [] as { url: string, strength: number }[];
    for (let item of items) {
        list.push({
            url: item.url,
            strength: getStockStrength(
                item,
                JSON.parse(await requester.request(`/items/${item.id}/stockers`)))
        });
    }
    if (list.length !== items.length) {
        throw new Error();
    }
    return list;
}

function getStockStrength(item: any, stockers: any[]) {
    return stockers.length / item.body.length;
}

main();
