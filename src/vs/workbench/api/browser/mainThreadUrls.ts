/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtHostContext, IExtHostContext, MainContext, MainThreadUrlsShape, ExtHostUrlsShape } from 'vs/workbench/api/common/extHost.protocol';
import { extHostNamedCustomer } from '../common/extHostCustomers';
import { IURLService, IURLHandler } from 'vs/platform/url/common/url';
import { URI } from 'vs/base/common/uri';
import { IDisposable } from 'vs/base/common/lifecycle';
import { IExtensionUrlHandler } from 'vs/workbench/services/extensions/common/inactiveExtensionUrlHandler';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { isNative } from 'vs/base/common/platform';
import { IProductService } from 'vs/platform/product/common/product';

class ExtensionUrlHandler implements IURLHandler {

	constructor(
		private readonly proxy: ExtHostUrlsShape,
		private readonly handle: number,
		readonly extensionId: ExtensionIdentifier
	) { }

	handleURL(uri: URI): Promise<boolean> {
		if (!ExtensionIdentifier.equals(this.extensionId, uri.authority)) {
			return Promise.resolve(false);
		}

		return Promise.resolve(this.proxy.$handleExternalUri(this.handle, uri)).then(() => true);
	}
}

@extHostNamedCustomer(MainContext.MainThreadUrls)
export class MainThreadUrls implements MainThreadUrlsShape {

	private readonly proxy: ExtHostUrlsShape;
	private handlers = new Map<number, { extensionId: ExtensionIdentifier, disposable: IDisposable }>();

	constructor(
		context: IExtHostContext,
		@IURLService private readonly urlService: IURLService,
		@IExtensionUrlHandler private readonly inactiveExtensionUrlHandler: IExtensionUrlHandler,
		@IProductService private readonly productService: IProductService
	) {
		this.proxy = context.getProxy(ExtHostContext.ExtHostUrls);
	}

	$registerUriHandler(handle: number, extensionId: ExtensionIdentifier): Promise<void> {
		const handler = new ExtensionUrlHandler(this.proxy, handle, extensionId);
		const disposable = this.urlService.registerHandler(handler);

		this.handlers.set(handle, { extensionId, disposable });
		this.inactiveExtensionUrlHandler.registerExtensionHandler(extensionId, handler);

		return Promise.resolve(undefined);
	}

	$unregisterUriHandler(handle: number): Promise<void> {
		const tuple = this.handlers.get(handle);

		if (!tuple) {
			return Promise.resolve(undefined);
		}

		const { extensionId, disposable } = tuple;

		this.inactiveExtensionUrlHandler.unregisterExtensionHandler(extensionId);
		this.handlers.delete(handle);
		disposable.dispose();

		return Promise.resolve(undefined);
	}

	async $createAppUri(extensionId: ExtensionIdentifier, options?: { payload?: { path?: string, query?: string, fragment?: string } }): Promise<URI> {
		const { path, query, fragment } = options && options.payload ? options.payload : { path: undefined, query: undefined, fragment: undefined };

		if (isNative) {
			return this.doCreateAppUriDesktop(extensionId, path, query, fragment);
		}

		return this.doCreateAppUriWeb(extensionId, path, query, fragment);
	}

	private doCreateAppUriDesktop(extensionId: ExtensionIdentifier, path?: string, query?: string, fragment?: string): URI {
		return URI.from({ scheme: this.productService.urlProtocol, authority: extensionId.value, path, query, fragment });
	}

	private doCreateAppUriWeb(extensionId: ExtensionIdentifier, path?: string, query?: string, fragment?: string): URI {
		let baseAppUriRaw = `http://foo/${extensionId.value}`;

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

	dispose(): void {
		this.handlers.forEach(({ disposable }) => disposable.dispose());
		this.handlers.clear();
	}
}
