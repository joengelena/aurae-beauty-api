import { ListingAttribute } from '../../resources/types';

function mapListingAttributesDbToObject(
	listingAttributes: any[],
): ListingAttribute[] {
	return listingAttributes.map((listingAttribute) => {
		if (listingAttribute.name === 'cylinders') {
			return {
				name: listingAttribute.name,
				attributeValues: listingAttribute.attribute_values as number[],
			};
		}
		return {
			name: listingAttribute.name,
			attributeValues: listingAttribute.attribute_values as string[],
		};
	});
}

export default mapListingAttributesDbToObject;
