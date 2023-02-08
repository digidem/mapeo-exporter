#!/usr/bin/env node

import * as fs from 'fs/promises'
import * as path from 'path'

import mri from 'mri'
import dedent from 'dedent'

import { MapeoExporter } from '../index.js'

const flags = mri(process.argv.slice(2), {
  alias: {
    help: 'h',
    input: 'i',
    output: 'o'
  },
  default: {
    input: process.cwd(),
  }
})

const args = flags._
const cmd = args.shift()

const helpMessage = dedent`
    Usage: mapeo-exporter [options]

    Options:
        --help, -h      Show this help message
        --input, -i     Input directory (default: current directory)
        --output, -o    Output directory (required)

    Examples:
        mapeo-exporter --output ./export
        mapeo-exporter --input ./kappa.db --output ./export
`

if ((cmd && cmd === 'help') || flags.help) {
  console.log(helpMessage)
  process.exit()
}

if (!flags.output) {
    console.log(
        dedent`
            Specify an output directory with \`--output\`.
            See more help with \`--help\`.
        `
    )
    process.exit(1)
}

const inputDirectory = path.join(process.cwd(), flags.input)
const outputDirectory = path.join(process.cwd(), flags.output)

try {
    const stats = await fs.stat(inputDirectory)

    if (!stats.isDirectory()) {
        console.log(
            dedent`
                Input directory does not exist: ${inputDirectory}
                A file was found at the input path.
            `
        )
        process.exit(1)
    }
} catch (error) {
    console.log(`Input directory does not exist: ${inputDirectory}`)
    process.exit(1)
}

const exporter = new MapeoExporter(inputDirectory)
await exporter.export(outputDirectory)
