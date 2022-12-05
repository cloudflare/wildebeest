import { component$ } from '@builder.io/qwik'

type Props = {
	data: Array<number>
	width?: number
	height?: number
	margin?: number
	color?: string
}

type Point = {
	x: number
	y: number
}

export const Sparkline = component$((props: Props) => {
	const defaults = {
		margin: 2,
		width: 50,
		height: 33,
		color: '#aaabff',
	}
	const height = props.height || defaults.height
	const width = props.width || defaults.width
	const margin = props.margin || defaults.margin
	const color = props.color || defaults.color

	const dataToPoints = (data: Array<number>) => {
		const max = Math.max(...data)
		const min = Math.min(...data)

		const len = data.length
		const vfactor = (height - margin * 2) / (max - min || 2)
		const hfactor = (width - margin * 2) / (len - (len > 1 ? 1 : 0))

		return data.map((d, i) => ({
			x: i * hfactor + margin,
			y: (max === min ? 1 : max - d) * vfactor + margin,
		}))
	}

	const points = dataToPoints(props.data)

	let prev: Point
	const divisor = 0.25
	const curve = (p: Point) => {
		let res
		if (!prev) {
			res = [p.x, p.y]
		} else {
			const len = (p.x - prev.x) * divisor
			res = ['C', prev.x + len, prev.y, p.x - len, p.y, p.x, p.y]
		}
		prev = p
		return res
	}
	const linePoints = points.map((p) => curve(p)).reduce((a, b) => a.concat(b))
	const closePolyPoints = [
		'L' + points[points.length - 1].x,
		height - margin,
		margin,
		height - margin,
		margin,
		points[0].y,
	]
	const fillPoints = linePoints.concat(closePolyPoints)

	const lineStyle = {
		stroke: color,
		strokeWidth: '1',
		strokeLinejoin: 'round',
		strokeLinecap: 'round',
		fill: 'none',
	}
	const fillStyle = {
		stroke: 'none',
		strokeWidth: '0',
		fillOpacity: '.1',
		fill: color,
	}

	return (
		<svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
			<g>
				<path d={'M' + fillPoints.join(' ')} style={fillStyle} />
				<path d={'M' + linePoints.join(' ')} style={lineStyle} />
			</g>
		</svg>
	)
})
