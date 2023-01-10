declare const COMMIT_INFO: {
	hash: string
}

export function getCommitHash(): string {
	return COMMIT_INFO.hash
}
