import chalk from 'chalk';

export const logger = {
  info: (msg) => console.log(chalk.blue('ℹ'), msg),
  success: (msg) => console.log(chalk.green('✓'), msg),
  warn: (msg) => console.log(chalk.yellow('⚠'), msg),
  error: (msg) => console.log(chalk.red('✗'), msg),
  step: (msg) => console.log(chalk.cyan('→'), msg),
  title: (msg) => console.log(chalk.bold.white('\n' + msg)),
  divider: () => console.log(chalk.dim('─'.repeat(50))),
  blank: () => console.log(),
  highlight: (msg) => console.log(chalk.magenta(msg)),
};
