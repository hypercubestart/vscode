/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IURLService, IURLHandler, IURLCreateOptions } from 'vs/platform/url/common/url';
import { URI } from 'vs/base/common/uri';
import product from 'vs/platform/product/node/product';
import { ServiceIdentifier } from 'vs/platform/instantiation/common/instantiation';
import { values } from 'vs/base/common/map';
import { first } from 'vs/base/common/async';
import { IDisposable } from 'node-pty';
import { toDisposable } from 'vs/base/common/lifecycle';

export class URLService implements IURLService {

	_serviceBrand!: ServiceIdentifier<any>;

	private handlers = new Set<IURLHandler>();

	create(identifier: string, options?: IURLCreateOptions): URI {
		const { path, query, fragment } = options ? options : { path: undefined, query: undefined, fragment: undefined };
		return URI.from({ scheme: product.urlProtocol, authority: identifier, path, query, fragment });
	}

	open(uri: URI): Promise<boolean> {
		const handlers = values(this.handlers);
		return first(handlers.map(h => () => h.handleURL(uri)), undefined, false).then(val => val || false);
	}

	registerHandler(handler: IURLHandler): IDisposable {
		this.handlers.add(handler);
		return toDisposable(() => this.handlers.delete(handler));
	}
}
