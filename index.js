import * as path from 'path'
import * as fs from 'fs/promises'
import { createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'

import Mapeo from '@mapeo/core'
import kappa from 'kappa-core'
import raf from 'random-access-file'
import level from 'level'
import kappaOsm from 'kappa-osm'
import blobstore from 'safe-fs-blob-store'

export class MapeoExporter {
    /**
     * Export observations and media from a Mapeo 5 project
     * @param {String} directory - Path to Mapeo 5 project directory
     * @returns {MapeoExporter}
     * @constructor
     */
    constructor (directory) {
        this.directory = directory
        this.osm = kappaOsm({
            dir: directory,
            core: kappa(directory, { valueEncoding: 'json' }),
            index: level(path.join(directory, 'index')),
            storage: (name, callback) => {
                callback(null, raf(path.join(directory, name)))
            }
        })
        this.blobstore = blobstore(path.join(directory, 'media'))
        this.mapeo = new Mapeo(this.osm, this.blobstore)
    }

    /**
     * @returns {Promise<Object[]>} - Array of observations
     */
    async observations (options) {
        const stream = this.mapeo.observationStream(options)
        const observations = []

        for await (const observation of stream) {
            observations.push(observation)
        }

        return observations
    }

    /**
     * @returns {Promise<String[]>} - Array of media keys
     */
    async media () {
        return new Promise((resolve, reject) => {
            this.blobstore.list((err, list) => {
                if (err) return reject(err)
                resolve(list)
            })
        })
    }

    /**
     * @param {String} key - Media file key
     * @param {String} filepath - Filepath to save media file
     * @returns {Promise<void>} - Readable stream of media file data
     */
    async copyFile (key, filepath) {
        const read = this.blobstore.createReadStream({ key })
        const write = createWriteStream(filepath)
        await pipeline(read, write)
    }

    async export (outputDirectory) {
        if (!outputDirectory) {
            throw new Error('outputDirectory is required')
        }

        const observations = await this.observations()
        const keys = await this.media()

        await fs.writeFile(path.join(outputDirectory, 'observations.json'), JSON.stringify(observations, null, 2))

        for (const key of keys) {
            const filepath = path.join(outputDirectory, 'media', key)
            await fs.mkdir(path.dirname(filepath), { recursive: true })
            await this.copyFile(key, filepath)
        }
    }
}
