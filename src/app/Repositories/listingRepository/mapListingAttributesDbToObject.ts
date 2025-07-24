import { RowDataPacket } from 'mysql2';
import { ListingAttribute } from '../../resources/types';

function mapListingAttributesDbToObject(
	ListingAttributes: RowDataPacket[]
): ListingAttribute[] {
	return ListingAttributes.map((listingAttribute) => {
		return {
			name: listingAttribute.name,
			attributeValues: listingAttribute.attribute_values as Array<string>,
		};
	});
}

export default mapListingAttributesDbToObject;
