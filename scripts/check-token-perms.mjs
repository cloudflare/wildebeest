import { API_TOKEN_TEMPLATE } from "./generate-one-click-deploy-button.mjs"
import https from "node:https"

const token = process.argv[2]

function get(url) {
    return new Promise(resolve => {
        const opts = {
            headers: {
                'Authorization': 'Bearer ' + token,
                'Accept': 'application/json',
            }
        };
        console.log({ opts });
        https.get(url, opts, res => {
            res.setEncoding('utf8');

            let body = "";
            res.on('data', function (chunk) {
                body += chunk;
            });

            res.on('end', () => {
                resolve({ body: JSON.parse(body), statusCode: res.statusCode })
            })

        })
    })
}

async function getTokenId() {
    try {
    const res = await get('https://api.cloudflare.com/client/v4/user/tokens/verify')
          console.log('statusCode:', res.statusCode);
          console.log('statusCode:', JSON.stringify(res.body, 2, 2));

    } catch (err) {
        throw new Error("failed to get token id: " + err)
    }
}


await getTokenId()

// console.log({ API_TOKEN_TEMPLATE });
