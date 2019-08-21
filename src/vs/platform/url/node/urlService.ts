/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IURLCreateOptions } from 'vs/platform/url/common/url';
import { URI } from 'vs/base/common/uri';
import product from 'vs/platform/product/node/product';
import { AbstractURLService } from 'vs/platform/url/common/urlService';

export class URLService extends AbstractURLService {

	create(identifier: string, options?: IURLCreateOptions): URI {
		const { path, query, fragment } = options ? options : { path: undefined, query: undefined, fragment: undefined };

		return URI.from({ scheme: product.urlProtocol, authority: identifier, path, query, fragment });
	}
}
