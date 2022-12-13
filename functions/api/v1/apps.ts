export const onRequest = () => {
    const res = {
        name: 'test app',
        website: 'example.com',
        redirect_uri: 'urn:ietf:wg:oauth:2.0:oob',
        client_id: 'TWhM-tNSuncnqN7DBJmoyeLnk6K3iJJ71KKXxgL1hPM',
        client_secret: 'ZEaFUFmF0umgBX1qKJDjaU99Q31lDkOU8NutzTOoliw',
        vapid_key: 'BCk-QqERU0q-CfYZjcuB6lnyyOYfJ2AifKqfeGIm7Z-HiTU5T9eTG5GxVA0_OH5mMlI4UkkDTpaZwozy0TzdZ2M=',
    }
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'content-type',
        'content-type': 'application/json; charset=utf-8',
    }
    return new Response(JSON.stringify(res), { headers })
}
