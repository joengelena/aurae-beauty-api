import { RowDataPacket } from 'mysql2';
import { ListingFilters } from '../../resources/types';

function mapListingFiltersDbToListingFiltersDTO(
	listingFilters: RowDataPacket[]
): ListingFilters[] {
	return listingFilters.map((listingFilter) => {
		return {
			name: listingFilter.name,
			filterValues: listingFilter.filter_values,
		};
	});
}

export default mapListingFiltersDbToListingFiltersDTO;
