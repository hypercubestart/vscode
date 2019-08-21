/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IURLService, IURLCreateOptions } from 'vs/platform/url/common/url';
import { URI, UriComponents } from 'vs/base/common/uri';
import { ServiceIdentifier } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { AbstractURLService } from 'vs/platform/url/common/urlService';
import { IRequestService } from 'vs/platform/request/common/request';
import { CancellationToken } from 'vs/base/common/cancellation';
import { streamToBuffer } from 'vs/base/common/buffer';
import { ILogService } from 'vs/platform/log/common/log';

export class BrowserURLService extends AbstractURLService {

	_serviceBrand!: ServiceIdentifier<any>;

	constructor(
		@IRequestService private readonly requestService: IRequestService,
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	create(identifier: string, options?: IURLCreateOptions): URI {
		const { path, query, fragment } = options ? options : { path: undefined, query: undefined, fragment: undefined };

		let baseAppUriRaw = `${window.location.origin}/callback?vscode-id=${identifier}`;

		if (path) {
			baseAppUriRaw += `&vscode-path=${encodeURIComponent(path)}`;
		}

		if (query) {
			baseAppUriRaw += `&vscode-query=${encodeURIComponent(query)}`;
		}

		if (fragment) {
			baseAppUriRaw += `&vscode-fragment=${encodeURIComponent(fragment)}`;
		}

		this.doFetch(identifier);

		return URI.parse(baseAppUriRaw);
	}

	private async doFetch(identifier: string): Promise<void> {
		const result = await this.requestService.request({
			url: `${window.location.origin}/fetch-callback?vscode-id=${identifier}`
		}, CancellationToken.None);

		const content = await streamToBuffer(result.stream);

		if (content.byteLength === 0) {
			setTimeout(() => this.doFetch(identifier), 500);
		} else {
			try {
				const uris: UriComponents[] = JSON.parse(content.toString());
				uris.forEach(uri => this.open(URI.revive(uri)));
			} catch (error) {
				this.logService.error(error);
			}
		}
	}
}

registerSingleton(IURLService, BrowserURLService, true);
