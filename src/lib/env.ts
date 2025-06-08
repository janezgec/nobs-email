export function getVariable(variableName: string): string {
  if(typeof process === 'undefined') {
    return import.meta.env[variableName] || '';
  } else {
    if(import.meta?.env && import.meta.env[variableName]) {
      return import.meta.env[variableName] || '';
    } else {
      return process.env[variableName] || '';
    }
  }
}