//shykuni
//daxyzeus
const crypto = require('crypto')
const os = require('os')

//user vars
let cookie = '' //value of the .ROBLOSECURITY cookie here
let idToSnipe = '12345' //id number of the limited here (keep in string, inaccuracy in high integers will break stuff on newer lims with randomized ids)
let budgetLimit = 0 //maximum price in robux youll pay for it
const waitTime = 1.3 //in seconds btw, the higher the less chance youll snipe it before someone else does but the more lenient roblox will be on your requests
//^id go for like a second or less, since it actually does the waiting after the last check which takes a couple hundred ms anyways

let userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0';
let csrfToken;
let account;
let count = 0;

async function main() {
    try {
        console.log('getting account info')

        account = await getAccountInfo()
        if (account.error) throw `getAccountInfo error: ${account.error}`

        console.log(`logged into @${account.name} (${account.id})`)
        console.log('getting item info')

        let item = await getItemInfo(idToSnipe)
        if (item.error) throw `getItemInfo error: ${item.error}`;
        if (!item.id) throw `getItemInfo didn't return id, here's the response json: ${JSON.stringify(item)}`;
        if (!item.collectibleItemId) throw 'item has no collectible id';

        console.log(`got item info for ${item.name}`)
        console.log(`budget is set to ${budgetLimit} robux`)
        console.log('starting check loop')

        async function checkLoop() {
            logSeparator()

            try {
                if (count > 0) console.log(`successfully bought or attempted to buy item ${count} time${(count > 1) ? "s" : ""}`)
                
                console.log(`checking item ${item.id}`)

                let lowestReseller = await getLowestReseller(item.collectibleItemId)
                if (lowestReseller.error) throw `getLowestReseller error: ${lowestReseller.error}`;

                let fancyPrice = `R$${lowestReseller.price}`

                console.log(`current resale price: ${fancyPrice}`)

                if (lowestReseller.price <= budgetLimit) {
                    console.log('item has reseller within price range! attempting to buy...')

                    count++
                    
                    let bought = await buyItem(item, lowestReseller)
                    if (bought.error) throw `buyItem error: ${bought.error}`;

                    if (bought.purchased) {
                        console.log(`successfully bought item for ${fancyPrice}! exiting...`)
                        return process.exit(0);
                    } else {
                        throw `couldn't buy item, here's the response json: ${JSON.stringify(bought)}`;
                    }
                }

                console.log(`checking again in ${waitTime}s`)
                setTimeout(checkLoop, waitTime * 1000)
            } catch (err) {
                console.error('checkLoop error!', err)
                console.log(`checking again in ${waitTime}s`)

                setTimeout(checkLoop, waitTime * 1000)
            }
        }

        checkLoop()
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
}

async function getAccountInfo() {
    try {
        let res = await fetch('https://users.roblox.com/v1/users/authenticated', {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Cookie': `.ROBLOSECURITY=${cookie}`,
                'Origin': 'https://www.roblox.com',
                'Pragma': 'no-cache',
                'Referer': 'https://www.roblox.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'User-Agent': userAgent
            }
        })

        let data = await res.json()
        if (!res.ok) throw `${res.status} ${res.statusText}: ${JSON.stringify(data)}`

        return data;
    } catch (err) {
        return { error: err?.stack || err };
    }
}

async function getItemInfo(id) {
    try {
        let res = await fetch(`https://catalog.roblox.com/v1/catalog/items/${encodeURIComponent(id)}/details?itemType=asset`, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Cookie': `.ROBLOSECURITY=${cookie}`,
                'Origin': 'https://www.roblox.com',
                'Pragma': 'no-cache',
                'Referer': 'https://www.roblox.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'User-Agent': userAgent
            }
        })

        let data = await res.json()
        if (!res.ok) throw `${res.status} ${res.statusText}: ${JSON.stringify(data)}`

        return data;
    } catch (err) {
        return { error: err?.stack || err };
    }
}

async function getLowestReseller(collectibleId) {
    try {
        let res = await fetch(`https://apis.roblox.com/marketplace-sales/v1/item/${encodeURIComponent(collectibleId)}/resellers?cursor=&limit=1`, {
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Cookie': `.ROBLOSECURITY=${cookie}`,
                'Origin': 'https://www.roblox.com',
                'Pragma': 'no-cache',
                'Referer': 'https://www.roblox.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'User-Agent': userAgent
            }
        })

        let data = await res.json()
        if (!res.ok) throw `${res.status} ${res.statusText}: ${JSON.stringify(data)}`
        if (!data.data || !data.data[0]) throw `didn't return resellers: ${JSON.stringify(data)}`;

        let lowestReseller = data.data[0]
        return lowestReseller;
    } catch (err) {
        return { error: err?.stack || err };
    }
}

async function buyItem(item, reseller) {
    try {
        let body = {
            collectibleItemId: item.collectibleItemId,
            collectibleItemInstanceId: reseller.collectibleItemInstanceId,
            collectibleProductId: reseller.collectibleProductId,
            expectedCurrency: 1,
            expectedPrice: reseller.price,
            expectedPurchaserId: String(account.id),
            expectedPurchaserType: 'User',
            expectedSellerId: 1, //weird, it doesnt put the reseller user id here
            expectedSellerType: null, //why
            idempotencyKey: crypto.randomUUID()
        }

        let res = await csrfFetch(`https://apis.roblox.com/marketplace-sales/v1/item/${encodeURIComponent(item.collectibleItemId)}/purchase-resale`, {
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cache-Control': 'no-cache',
                'Content-Type': 'application/json;charset=utf-8',
                'Cookie': `.ROBLOSECURITY=${cookie}`,
                'Origin': 'https://www.roblox.com',
                'Pragma': 'no-cache',
                'Referer': 'https://www.roblox.com/',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'User-Agent': userAgent
            },
            method: 'POST',
            body: JSON.stringify(body)
        })

        let data = await res.json()
        if (!res.ok) throw `${res.status} ${res.statusText}: ${JSON.stringify(data)}`

        return data;
    } catch (err) {
        return { error: err?.stack || err };
    }
}

async function csrfFetch(url, options = {}) {
    return await new Promise(async (resolve, reject) => {
        try {
            let isPost = [ 'POST', 'PATCH', 'PUT', 'DELETE' ].includes(options.method)
            if (isPost) {
                if (!options.headers) options.headers = {}
                options.headers['x-csrf-token'] = csrfToken;
            }

            let res = await fetch(url, options)
            if (isPost && res.headers.get('x-csrf-token')) {
                csrfToken = res.headers.get('x-csrf-token')
                options.headers['x-csrf-token'] = csrfToken;
                res = await fetch(url, options)
            }

            resolve(res)
        } catch (err) {
            reject(err)
        }
    });
}

function logSeparator() {
    console.log('-'.repeat(16))
}

main()