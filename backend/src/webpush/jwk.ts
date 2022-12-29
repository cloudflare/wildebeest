export interface JWK {
	crv: string
	kty: string
	key_ops: string[]
	ext: boolean
	d: string
	x: string
	y: string
}
