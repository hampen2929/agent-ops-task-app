"""Validate the CLI response before allowing a machine acceptance decision."""
import json


def parse_response(raw):
    try:
        response = json.loads(raw)
    except (ValueError, TypeError) as error:
        return {}, str(error)
    if not isinstance(response, dict):
        return {}, 'CLI response must be an object'
    if response.get('is_error') is not False or response.get('subtype') != 'success':
        return response, 'CLI response does not explicitly report successful completion'
    return response, None


def accepts(response_error, timed_out, exit_code, changed, checks):
    required = {'grade', 'typecheck', 'regression', 'lint'}
    return (response_error is None and not timed_out and exit_code == 0
            and not changed and set(checks) == required
            and all(code == 0 for code in checks.values()))
