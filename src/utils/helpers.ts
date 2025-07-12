import { ValidationError } from "express-validator";

export function getErrorMessage(errors: ValidationError[], field: string): string | undefined {
    return errors.find(error => "path" in error && error.path === field)?.msg;
}
