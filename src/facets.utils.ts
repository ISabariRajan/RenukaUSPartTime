import { BenefitBookletReqBody } from '../types/benefitBooklets'
import { Bundle, Coverage } from '../types/m360'
import { MemberPlan } from '../types/memberPlans'
import { convertDateFormat } from './date.utils'

export const formatPhoneNumber = (phoneNumber: string | undefined) => {
	//--- Check if phone number is 10 digits
	const usNumber10 = phoneNumber?.match(/^(\d{3})(\d{3})(\d{4})$/)
	//--- Check if phone number is 11 digits - with extension code (1)
	const usNumber11 = phoneNumber?.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/)

	if (usNumber10) {
		return '(' + usNumber10[1] + ') ' + usNumber10[2] + '-' + usNumber10[3]
	}
	if (usNumber11) {
		return (
			usNumber11[1] +
			'-' +
			usNumber11[2] +
			'-' +
			usNumber11[3] +
			'-' +
			usNumber11[4]
		)
	}
}

/**
 * Get the vanity URL that points toward the public site Medicaid program page
 * @param productId A string parameter used to check if there is a match
 * @returns the Medicaid vanity URL
 */
export const getMedicaidVanityUrl = (
	productId?: string,
	year?: string,
): string => {
	let vanityUrl: string
	switch (productId) {
		// --- Blue Advantage Families And Children (Copays - No copays)
		case 'PMAP0001':
		case 'PMAP0002':
			vanityUrl = `https://www.bluecrossmn.com/MH-BAFC-${year}`
			break
		// --- Minnesota Senior Health Options (MSHO) - SecureBlue
		case 'MSHO0001':
			vanityUrl = `https://www.bluecrossmn.com/MH-SBMSC-${year}`
			break
		// --- MinnesotaCare (Copays - No copays)
		case 'MCAR0001':
		case 'MCAR0002':
			vanityUrl = `https://www.bluecrossmn.com/MH-MNC-${year}`
			break
		// --- Minnesota Senior Care Plus (MSC+) (Copays - No copays)
		case 'MSCP0001':
		case 'MSCP0002':
			vanityUrl = `https://www.bluecrossmn.com/MH-MSCP-${year}`
			break
		default:
			vanityUrl =
				'https://www.bluecrossmn.com/shop-plans/minnesota-health-care-programs'
	}

	return vanityUrl
}

/**
 * A function that finds the start date of an active coverage plan, either dental or vision, from a bundle of coverages.
 * @param coverageBundle A coverage bundle object
 * @param planType A string
 * @returns The specific start date that satisties the given condition
 */
const findStartDate = (
	coverageBundle: Bundle,
	planType: string,
): string | undefined => {
	if (!coverageBundle.entry) return

	let startDate: string | undefined

	coverageBundle.entry.some((entry) => {
		const coverage = entry?.resource as Coverage
		if (
			coverage.status === 'active' &&
			coverage.type?.coding?.some((coding) =>
				planType === 'dental'
					? coding.code === 'DENTPRG'
					: coding.code === 'VISPOL',
			)
		) {
			startDate = coverage.period?.start
			return true
		}
		return false
	})

	return convertDateFormat(startDate)
}

/**
 * A function that finds the end date of an active coverage plan, either dental or vision, from a bundle of coverages.
 * @param coverageBundle A coverage bundle object
 * @param planType A string
 * @returns The specific end date that satisties the given condition
 */
const findEndDate = (
	coverageBundle: Bundle,
	planType: string,
): string | undefined => {
	if (!coverageBundle.entry) return

	let endDate: string | undefined

	coverageBundle.entry.some((entry) => {
		const coverage = entry?.resource as Coverage
		if (
			coverage.status === 'active' &&
			coverage.type?.coding?.some((coding) =>
				planType === 'dental'
					? coding.code === 'DENTPRG'
					: coding.code === 'VISPOL',
			)
		) {
			endDate = coverage.period?.end
			return true
		}
		return false
	})

	return convertDateFormat(endDate)
}

/**
 * A function that finds the group number of an active coverage plan, either dental or vision, from a bundle of coverages.
 * @param coverageBundle A coverage bundle object
 * @param planType A string
 * @returns The specific group number that satisties the given condition
 */
const findGroupNumber = (
	coverageBundle: Bundle,
	planType: string,
): string | undefined => {
	if (!coverageBundle.entry) return

	let groupNumber: string | undefined

	coverageBundle.entry.some((entry) => {
		const coverage = entry?.resource as Coverage
		if (
			coverage.status === 'active' &&
			coverage.type?.coding?.some((coding) =>
				planType === 'dental'
					? coding.code === 'DENTPRG'
					: coding.code === 'VISPOL',
			)
		) {
			groupNumber = coverage.class?.find((cls) =>
				cls.type?.coding?.some((coding) => coding.code === 'group'),
			)?.value?.value
			return true
		}
		return false
	})

	return groupNumber
}

/**
 * A function that takes memberPlan, coverageBundle, and planType as parameters and returns a BenefitBookletReqBody object for BO2
 * @param memberPlan An object that contains the member's plan
 * @param coverageBundle A coverage bundle object
 * @param planType A string
 * @returns An object that will be used as the request body for the benefit booklet BO2 api call
 */
export const buildBenefitBookletReqBodyBO2 = (
	memberPlan: MemberPlan,
	coverageBundle: Bundle,
	planType: string,
): BenefitBookletReqBody => {
	const { demographics, memberIdentifier, clientId } = memberPlan

	const benefitBookletReqBody = {
		memberIdentifiers: {
			firstName: demographics?.legalFirstName,
			lastName: demographics?.legalLastName,
			memberId: memberIdentifier,
			dateOfBirth: convertDateFormat(demographics?.dateOfBirth),
			brand: 'MINCR',
		},
		myBenefitRequest: {
			visionCoverage: planType === 'vision' ? true : false,
			icisClientId: clientId,
			groupNumber: findGroupNumber(coverageBundle, planType),
			medicalCoverage: planType === 'medical' ? true : false,
			drugCoverage: false,
			coverageCancelDate: findEndDate(coverageBundle, planType),
			curEffDate: findStartDate(coverageBundle, planType),
			dentalCoverage: planType === 'dental' ? true : false,
			alertCounterReq: 'Y',
		},
	}

	return benefitBookletReqBody
}
