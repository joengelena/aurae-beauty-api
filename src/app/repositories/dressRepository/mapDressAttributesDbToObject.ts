import { ListingAttribute } from '../../resources/types';

function mapDressAttributesDbToObject(
	dressAttributes: any[],
): ListingAttribute[] {
	return dressAttributes.map((dressAttribute) => {
		return {
			name: dressAttribute.name,
			attributeValues: dressAttribute.attribute_values as string[],
		};
	});
}

export default mapDressAttributesDbToObject;
