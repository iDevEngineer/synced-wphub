import enquirer from 'enquirer';

const { prompt } = enquirer;

/**
 * Ask a simple yes/no question
 */
export async function confirm(message, initial = true) {
  const response = await prompt({
    type: 'confirm',
    name: 'value',
    message,
    initial,
  });
  return response.value;
}

/**
 * Ask for a text input with optional default
 */
export async function input(message, initial = '') {
  const response = await prompt({
    type: 'input',
    name: 'value',
    message,
    initial,
  });
  return response.value;
}

/**
 * Ask for a password/secret (hidden input)
 */
export async function password(message) {
  const response = await prompt({
    type: 'password',
    name: 'value',
    message,
  });
  return response.value;
}

/**
 * Present a select list
 */
export async function select(message, choices) {
  const response = await prompt({
    type: 'select',
    name: 'value',
    message,
    choices,
  });
  return response.value;
}
