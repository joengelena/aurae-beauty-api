import { ListingAttribute } from '../../resources/types';

function mapListingAttributesDbToObject(
	listingAttributes: any[],
): ListingAttribute[] {
	return listingAttributes.map((listingAttribute) => {
		return {
			name: listingAttribute.name,
			attributeValues: listingAttribute.attribute_values as string[],
		};
	});
}

export default mapListingAttributesDbToObject;
