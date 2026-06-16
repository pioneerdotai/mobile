export type PioneerClientResponse<T> =
    | {
          status: 'ok';
          value: T;
      }
    | {
          status: 'error';
          message: string;
          code?: string | null;
      };

export class PioneerClientNativeError extends Error {
    readonly code?: string | null;

    constructor(message: string, code?: string | null) {
        super(message);
        this.name = 'PioneerClientNativeError';
        this.code = code;
    }
}

export const parsePioneerClientResponse = <T>(json: string): T => {
    let response: PioneerClientResponse<T>;
    try {
        response = JSON.parse(json) as PioneerClientResponse<T>;
    } catch (error) {
        throw new PioneerClientNativeError(
            error instanceof Error
                ? `Invalid pioneer client response JSON: ${error.message}`
                : 'Invalid pioneer client response JSON',
            'pioneer_client_invalid_response_json',
        );
    }

    if (response.status === 'ok') {
        return response.value;
    }

    if (response.status === 'error') {
        throw new PioneerClientNativeError(response.message, response.code);
    }

    throw new PioneerClientNativeError(
        'Invalid pioneer client response status',
        'pioneer_client_invalid_response_status',
    );
};
