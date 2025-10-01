import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', '..', 'data');

/**
 * JSON Storage Utility for Subscription Curator
 * Handles reading/writing JSON files in the /data folder
 */
export class JsonStore {
  /**
   * Get data from a JSON file
   * @param {string} filename - Name of the JSON file (without .json extension)
   * @returns {any} Parsed JSON data or default structure if file doesn't exist
   */
  static getData(filename) {
    try {
      const filePath = join(DATA_DIR, `${filename}.json`);
      const fileContent = readFileSync(filePath, 'utf8');
      return JSON.parse(fileContent);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // File doesn't exist, return default structure
        return this.getDefaultStructure(filename);
      }
      throw new Error(`Failed to read ${filename}.json: ${error.message}`);
    }
  }

  /**
   * Set/overwrite data in a JSON file
   * @param {string} filename - Name of the JSON file (without .json extension)
   * @param {any} data - Data to write
   */
  static setData(filename, data) {
    try {
      const filePath = join(DATA_DIR, `${filename}.json`);
      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      throw new Error(`Failed to write ${filename}.json: ${error.message}`);
    }
  }

  /**
   * Append an item to an array in a JSON file
   * @param {string} filename - Name of the JSON file (without .json extension)
   * @param {any} item - Item to append
   */
  static appendData(filename, item) {
    try {
      const currentData = this.getData(filename);
      if (!Array.isArray(currentData[filename])) {
        throw new Error(`Cannot append to non-array data in ${filename}.json`);
      }

      currentData[filename].push(item);
      this.setData(filename, currentData);
    } catch (error) {
      throw new Error(`Failed to append to ${filename}.json: ${error.message}`);
    }
  }

  /**
   * Get default structure for JSON files
   * @param {string} filename - Name of the file
   * @returns {Object} Default structure
   */
  static getDefaultStructure(filename) {
    const defaults = {
      users: { users: [] },
      channels: { channels: [] },
      tags: { tags: [] },
      selections: { selections: [] },
      watched: { watched: [] }
    };

    return defaults[filename] || { items: [] };
  }

  /**
   * Initialize all data files with default structures if they don't exist
   */
  static initializeDataFiles() {
    const files = ['users', 'channels', 'tags', 'selections', 'watched'];

    files.forEach(filename => {
      try {
        this.getData(filename); // This will create the file if it doesn't exist
      } catch (error) {
        console.error(`Failed to initialize ${filename}.json:`, error.message);
      }
    });
  }
}
