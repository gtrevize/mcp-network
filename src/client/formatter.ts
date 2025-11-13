import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
  timestamp?: string;
}

export class ResultFormatter {
  static formatSuccess(title: string, data: any, executionTime?: number): void {
    console.log('\n' + boxen(chalk.green.bold('✓ SUCCESS'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'green'
    }));

    console.log(chalk.cyan.bold(`\n${title}\n`));

    if (typeof data === 'object' && data !== null) {
      this.formatObject(data);
    } else {
      console.log(chalk.white(data));
    }

    if (executionTime) {
      console.log(chalk.gray(`\n⏱  Execution time: ${executionTime}ms`));
    }
    console.log();
  }

  static formatError(error: string): void {
    console.log('\n' + boxen(chalk.red.bold('✗ ERROR'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'red'
    }));

    console.log(chalk.red(error));
    console.log();
  }

  static formatObject(obj: any, indent: number = 0): void {
    const prefix = '  '.repeat(indent);

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        console.log(prefix + chalk.gray('(empty)'));
        return;
      }

      // Check if it's an array of simple values or objects
      if (obj.every(item => typeof item !== 'object')) {
        obj.forEach((item, index) => {
          console.log(prefix + chalk.yellow(`[${index}]`) + ' ' + chalk.white(item));
        });
      } else {
        // Array of objects - try to use table if possible
        if (obj.length > 0 && typeof obj[0] === 'object' && !Array.isArray(obj[0])) {
          this.formatTable(obj);
        } else {
          obj.forEach((item, index) => {
            console.log(prefix + chalk.yellow(`[${index}]`));
            this.formatObject(item, indent + 1);
          });
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
          console.log(prefix + chalk.cyan(key + ':') + ' ' + chalk.gray('null'));
        } else if (typeof value === 'object') {
          console.log(prefix + chalk.cyan(key + ':'));
          this.formatObject(value, indent + 1);
        } else if (typeof value === 'boolean') {
          console.log(prefix + chalk.cyan(key + ':') + ' ' + (value ? chalk.green('true') : chalk.red('false')));
        } else if (typeof value === 'number') {
          console.log(prefix + chalk.cyan(key + ':') + ' ' + chalk.yellow(value));
        } else {
          console.log(prefix + chalk.cyan(key + ':') + ' ' + chalk.white(value));
        }
      }
    } else {
      console.log(prefix + chalk.white(obj));
    }
  }

  static formatTable(data: any[]): void {
    if (data.length === 0) return;

    const keys = Object.keys(data[0]);
    const table = new Table({
      head: keys.map(k => chalk.cyan.bold(k)),
      style: {
        head: [],
        border: ['gray']
      }
    });

    data.forEach(row => {
      const values = keys.map(key => {
        const value = row[key];
        if (value === null || value === undefined) return chalk.gray('null');
        if (typeof value === 'boolean') return value ? chalk.green('✓') : chalk.red('✗');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      });
      table.push(values);
    });

    console.log(table.toString());
  }

  static formatToolList(tools: Array<{ name: string; description?: string }>): void {
    console.log('\n' + boxen(chalk.blue.bold('📋 Available Tools'), {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'blue'
    }));

    // Sort tools alphabetically by name
    const sortedTools = [...tools].sort((a, b) => a.name.localeCompare(b.name));

    sortedTools.forEach((tool, index) => {
      console.log(
        chalk.yellow(`${index + 1}.`) + ' ' +
        chalk.green.bold(tool.name) +
        (tool.description ? chalk.gray(' - ' + tool.description) : '')
      );
    });
    console.log();
  }

  static showSpinner(message: string): { succeed: (msg: string) => void; fail: (msg: string) => void } {
    // Simple spinner simulation since ora might have issues in some terminals
    console.log(chalk.blue('⏳ ' + message + '...'));
    return {
      succeed: (msg: string) => console.log(chalk.green('✓ ' + msg)),
      fail: (msg: string) => console.log(chalk.red('✗ ' + msg))
    };
  }

  static showHeader(): void {
    const header = `
╔═══════════════════════════════════════════╗
║                                           ║
║     MCP Network Testing Client            ║
║     Interactive Command Line Interface    ║
║                                           ║
╚═══════════════════════════════════════════╝
    `;
    console.log(chalk.cyan.bold(header));
    console.log(chalk.gray('Type your selection or use Ctrl+C to exit\n'));
  }

  static showInfo(message: string): void {
    console.log(chalk.blue('ℹ ' + message));
  }

  static showWarning(message: string): void {
    console.log(chalk.yellow('⚠ ' + message));
  }
}
