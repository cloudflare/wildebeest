const PROJECT_URL = 'https://github.com/cloudflare/wildebeest'
const ONE_CLICK_BASE_URL = 'https://deploy.workers.cloudflare.com'
const FIELDS = [
	{
		name: 'Zone ID',
		secret: 'CF_ZONE_ID',
		descr: 'Get your Zone ID from the Cloudflare Dashboard',
	},
	{
		name: 'Domain',
		secret: 'CF_DEPLOY_DOMAIN',
		descr: 'Domain on which your instance will be running',
	},
	{
		name: 'Instance title',
		secret: 'INSTANCE_TITLE',
		descr: 'Title of your instance',
	},
	{
		name: 'Administrator Email',
		secret: 'ADMIN_EMAIL',
		descr: 'An Email address that can be messaged regarding inquiries or issues',
	},
	{
		name: 'Instance description',
		secret: 'INSTANCE_DESCR',
		descr: 'A short, plain-text description of your instance',
	},
]

const API_TOKEN_TEMPLATE = JSON.stringify([
	{ key: 'd1', type: 'edit' },
	{ key: 'page', type: 'edit' },
	{ key: 'images', type: 'edit' },
	{ key: 'access', type: 'edit' },
	{ key: 'workers_kv_storage', type: 'edit' },
	{ key: 'access_acct', type: 'read' },
	{ key: 'dns', type: 'edit' },
	{ key: 'workers_scripts', type: 'edit' },
	{ key: 'account_rulesets', type: 'edit' },
])

const fields = FIELDS.map((x) => JSON.stringify(x))
	.map((v) => `fields=${v}`)
	.join('&')
const url = new URL(
	`/?url=${PROJECT_URL}&authed=true&${fields}&apiTokenTmpl=${API_TOKEN_TEMPLATE}&apiTokenName=Wildebeest`,
	ONE_CLICK_BASE_URL
)
console.log(url.href)
