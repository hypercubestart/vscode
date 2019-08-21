/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IURLService, IURLHandler, IURLCreateOptions } from 'vs/platform/url/common/url';
import { URI } from 'vs/base/common/uri';
import { ServiceIdentifier } from 'vs/platform/instantiation/common/instantiation';
import { IDisposable, Disposable } from 'vs/base/common/lifecycle';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IOpenerService } from 'vs/platform/opener/common/opener';

export class BrowserURLService implements IURLService {

	_serviceBrand!: ServiceIdentifier<any>;

	constructor(
		@IOpenerService private readonly openerService: IOpenerService
	) {
	}

	create(identifier: string, options?: IURLCreateOptions): URI {
		const { path, query, fragment } = options ? options : { path: undefined, query: undefined, fragment: undefined };

		let baseAppUriRaw = `http://foo/${identifier}`;

		if (path) {
			baseAppUriRaw += `?path=${encodeURIComponent(path)}`;
		}

		if (query) {
			baseAppUriRaw += `?query=${encodeURIComponent(query)}`;
		}

		if (fragment) {
			baseAppUriRaw += `?fragment=${encodeURIComponent(fragment)}`;
		}

		return URI.parse(baseAppUriRaw);
	}

	open(uri: URI): Promise<boolean> {
		return this.openerService.open(uri);
	}

	registerHandler(handler: IURLHandler): IDisposable {
		return Disposable.None;
	}
}

registerSingleton(IURLService, BrowserURLService, true);
