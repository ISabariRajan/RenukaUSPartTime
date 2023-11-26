import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactPaginate from 'react-paginate'
import 'react-super-responsive-table/dist/SuperResponsiveTableStyle.css'
import {
	Claim,
	ClaimsFilterStrategy,
	ClaimsListProps,
} from '../../types/claimsAndEobs'
import {
	claimProviderFilter,
	claimTypeFilter,
	dateFilter,
	orderByFilter,
	patientDisplayFilter,
	statusFilter,
} from '../../utils/claims.utils'

const ClaimListTable = dynamic(() => import('./ClaimListTable'))
const ClaimFilter = dynamic(() => import('./ClaimFilter'))

const ClaimList = ({
	claimsSummaryList,
	enableFilter,
	eobPdfIsFetching,
	eobPdfIsError,
	onClick,
	isMedicaid,
}: ClaimsListProps) => {
	const claimsPerPage = enableFilter ? 10 : 5
	const [currentClaims, setCurrentClaims] = useState<Claim[]>([])
	const [claimsListOffset, setClaimsListOffset] = useState(0)
	const [pageCount, setPageCount] = useState(0)
	const [claimsFilter, setClaimsFilter] = useState<
		Array<{ title: string; value: string }>
	>([])
	/**
	 * An object implementing the strategy pattern for filtering claims.
	 *
	 * The strategy pattern is used here to encapsulate different filtering algorithms
	 * into separate strategies, each represented by a function. This allows the filtering
	 * logic to be selected at runtime based on the filter type, making the code more flexible
	 * and easier to extend with new filter types.
	 *
	 * Each key in this object is the title of a filter, and the corresponding value is a
	 * function that implements the filtering logic for that filter type. When a filter is
	 * applied, the appropriate strategy is retrieved from this object using the filter title
	 * and then executed to perform the filtering.
	 */
	const filterStrategies: { [key: string]: ClaimsFilterStrategy } = {
		dateFilter,
		claimTypeFilter,
		statusFilter,
		orderByFilter,
		claimProviderFilter,
		patientDisplayFilter,
	}

	/**
	 * Memoized calculation that filters the list of claims based on the current filter state.
	 * The filtering process ignores the 'orderBy' filter and checks
	 * if each claim's property, corresponding to the filter's title, matches the filter's value.
	 * If there are no claims, it returns an empty array.
	 *
	 * @returns An array of filtered claims.
	 */
	const filteredClaims = useMemo(() => {
		let result = claimsSummaryList?.claims || []

		for (const filter of claimsFilter) {
			const strategy = filterStrategies[filter.title]
			if (strategy) {
				result = strategy(result, filter.value)
			}
		}

		return result
	}, [claimsSummaryList?.claims, claimsFilter])

	/**
	 * Memoized callback that handles the page click event for the pagination control.
	 * Calculates a new offset based on the selected page number and updates the `claimsListOffset` state with this new offset.
	 * This will cause the list of displayed claims to be updated.
	 *
	 * If there are no claims, it does nothing.
	 *
	 * @param event - The event object from the pagination control.
	 * @param event.selected - The selected page number.
	 */
	const handlePageClick = useCallback(
		(event: { selected: number }) => {
			if (claimsSummaryList?.claims) {
				const newOffset = event.selected * claimsPerPage
				setClaimsListOffset(newOffset)
			}
		},
		[claimsSummaryList?.claims, claimsPerPage],
	)

	//* On component mount, go to anchor if there is one.
	useEffect(() => {
		// Get the hash from the current URL (if any) and remove the leading '#'.
		// This gives us the ID of the element that the URL is linking to (the "anchor").
		const anchor = window.location.hash.slice(1)

		if (anchor) {
			const anchorEl = document.getElementById(anchor)
			// ...scroll to that element, with a smooth scrolling behavior.
			if (anchorEl) anchorEl.scrollIntoView({ behavior: 'smooth' })
		}
	}, [])

	//* This effect runs whenever the claimsListOffset, claimsPerPage, or filteredClaims changes.
	useEffect(() => {
		// Check if there are any filteredClaims.
		if (filteredClaims) {
			// Calculate the end offset for slicing the filteredClaims array.
			const endOffset = claimsListOffset + claimsPerPage
			// This gives us the claims for the current page.
			const splitItems = filteredClaims.slice(claimsListOffset, endOffset)
			// Update the state with the claims for the current page.
			setCurrentClaims(splitItems)
			// Calculate the total number of pages.
			setPageCount(Math.ceil(filteredClaims.length / claimsPerPage))
		}
	}, [claimsListOffset, claimsPerPage, filteredClaims])

	/**
	 * Adds a new filter to the claims filter list.
	 * @param title - The title of the filter.
	 * @param value - The value of the filter.
	 */
	const addFilter = (title: string, value: string) => {
		// Update the claimsFilter state by appending the new filter to the existing filters.
		setClaimsFilter((prevFilters) => [...prevFilters, { title, value }])
	}

	/**
	 * Removes a filter from the claims filter list.
	 * @param title - The title of the filter to remove.
	 */
	const removeFilter = (title: string) => {
		// Update the claimsFilter state by removing the filter with the given title.
		setClaimsFilter((prevFilters) =>
			prevFilters.filter((filter) => filter.title !== title),
		)
	}

	return (
		<>

            <div data-testid="claims-page-title" className="ml-[0px]">
                <PageTitle
                    mainPage={enableFilter ? "Claims Information" : ""}
                    subPage={"Claims"}
                />
            </div>
            
			<a id="claims" />
            <div className="ml-[-15px]">
                {/* Show message if no claims */}
                {!claimsSummaryList?.claims ||
                    (claimsSummaryList?.claims && claimsSummaryList.claims.length < 1 && (
                        <p className={"font-bold md:px-4" + (enableFilter ? "" : " mb-[10px]")}>No Claims in Past 24 months</p>
                    ))}
                {(claimsSummaryList?.claims && claimsSummaryList.claims.length > 0 && (
                        <p className={"md:px-4"  + (enableFilter ? "" : " mb-[10px]")}>Within the last 24 months</p>
                ))}



                {/* Claims page with filtering */}
                {claimsSummaryList?.claims && enableFilter && (
                    <ClaimFilter
                        addFilter={addFilter}
                        removeFilter={removeFilter}
                        claimsSummaryList={claimsSummaryList}
                    />
                )}


                {/* Claims list display */}
                {claimsSummaryList?.claims && (
                    <ClaimListTable
                        currentClaims={currentClaims}
                        isMedicaid={isMedicaid}
                        eobPdfIsFetching={eobPdfIsFetching}
                        eobPdfIsError={eobPdfIsError}
                        onClick={onClick}
                    />
                )}

                {/* Pagination if more than 10 claims */}
                {claimsSummaryList?.claims &&
                    claimsSummaryList.claims.length > 10 &&
                    enableFilter && (
                        <ReactPaginate
                            previousLabel="<"
                            nextLabel=">"
                            pageClassName="page-item"
                            pageLinkClassName="page-link flex h-5 w-5 p-4 content-center items-center text-center relative right-[4px] top-[1px]"
                            previousClassName="page-item ml-auto text-ToneBlue"
                            previousLinkClassName="page-link flex h-5 w-5 p-4 content-center items-center text-center relative right-[4px] top-[1px]"
                            nextClassName="page-item mr-auto text-ToneBlue"
                            nextLinkClassName="page-link flex h-5 w-5 p-4 content-center items-center text-center relative right-[4px] top-[1px]"
                            breakLabel="..."
                            breakClassName="page-item"
                            breakLinkClassName="page-link flex h-5 w-5 p-4 content-center items-center text-center relative right-[4px] top-[1px]"
                            pageCount={pageCount}
                            marginPagesDisplayed={2}
                            pageRangeDisplayed={5}
                            onPageChange={handlePageClick}
                            containerClassName="text-DigitalBlack text-sm font-bold w-full flex content-center mx-auto mt-8"
                            activeClassName="text-White bg-ToneBlue rounded-full"
                        />
                    )}
            </div>
		</>
	)
}

export default ClaimList
