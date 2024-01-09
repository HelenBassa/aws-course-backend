import { Inject, Injectable, Scope } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Cache } from 'cache-manager';
import axios, { AxiosRequestConfig } from 'axios';

interface IResponse {
  status: number;
  data: string | object;
}

const PRODUCTS = 'products';

@Injectable({ scope: Scope.REQUEST })
export class AppService {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}
  async getResponse(): Promise<IResponse> {
    const { originalUrl, method, body, headers } = this.request;
    console.log({ originalUrl });
    console.log({ method });
    console.log({ body });
    console.log({ headers });

    const [, recipient, ...path] = originalUrl.split('/');
    console.log({ recipient });
    console.log({ ...path });

    const recipientURL = process.env[recipient];
    console.log({ recipientURL });

    if (originalUrl === '/products' && method === 'GET') {
      const data: IResponse['data'] = await this.cacheManager.get(PRODUCTS);
      console.log('FROM CACHE:', data);
      if (data) return { status: 200, data };
    }

    if (recipientURL) {
      const url = `${recipientURL}/${path}`;
      console.log({ url });
      const axiosConfig: AxiosRequestConfig = {
        method: method,
        url: url.replace(/\/$/, ''),
        headers: headers.authorization
          ? { Authorization: headers.authorization }
          : {},
        ...(Object.keys(body || {}).length > 0 && { data: body }),
      };

      console.log('axiosConfig', axiosConfig);

      try {
        const { status, data } = await axios(axiosConfig);
        console.log('response from recipient', data);
        if (originalUrl === '/products' && method === 'GET') {
          const isTimerSeted = await this.cacheManager.get(PRODUCTS);
          if (!isTimerSeted) console.log('SET TO CACHE');
          await this.cacheManager.set(PRODUCTS, data, 120);
        }

        return { status, data };
      } catch (err) {
        console.log('some error', JSON.stringify(err));

        if (err.response) {
          const { status, data } = err.response;

          return { status, data };
        } else {
          return { status: 500, data: err.message };
        }
      }
    } else {
      return { status: 502, data: { error: 'Cannot process request' } };
    }
  }
}
