import * as dirname from 'desm'
import { MapeoExporter } from './index.js'

const directory = dirname.join(import.meta.url, './data/private-project/kappa.db')
const exporter = new MapeoExporter(directory)
const observations = await exporter.observations()
const filepaths = await exporter.media()
console.log('observations', observations.length)
console.log('filepaths', filepaths.length)
