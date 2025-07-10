import { RowDataPacket } from 'mysql2';
import { ListingFilters } from '../../resources/types';

function mapListingFiltersDbToObject(
	listingFilters: RowDataPacket[]
): ListingFilters[] {
	return listingFilters.map((listingFilter) => {
		return {
			name: listingFilter.name,
			filterValues: listingFilter.filter_values as Array<string>,
		};
	});
}

export default mapListingFiltersDbToObject;
