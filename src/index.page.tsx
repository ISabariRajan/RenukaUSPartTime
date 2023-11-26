import { useAuth0, withAuthenticationRequired } from '@auth0/auth0-react'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useMemberDataStore } from '../../data/zustand'
import { withoutTime } from '../../utils/date.utils'
import { filterIdCardPatients } from '../../utils/patients.utils'
import { skipBatchArgs, trpc } from '../../utils/trpc'
import { redirectEngenMember } from '../utils/navigation.utils'

//* Types
import {
	COVERAGE_CLASS_CODES,
	COVERAGE_CLASS_SYSTEM,
} from '../../data/coverage'
import { DrupalBanner } from '../../server/routers/drupal.router'
import { BenefitBookletReqBody } from '../../types/benefitBooklets'
import { Coverage } from '../../types/m360'
import { b64toBlob } from '../../utils/b64toBlob.utils'
import { buildBenefitBookletReqBodyBO2 } from '../../utils/facets.utils'
import { parseMemberPlanFromCoverage } from '../utils/coverage.utils'

//* Lazy loaded components
const ClaimList = dynamic(() => import('../../components/Claims/ClaimList'))

const TechnicalIssue = dynamic(
	() => import('../../components/Shared/TechnicalIssue/TechnicalIssue'),
)
const LoadingSpinner = dynamic(
	() => import('../../components/Shared/LoadingSpinner/LoadingSpinner'),
)
const PlanInformation = dynamic(
	() =>
		import('../../components/HomeComponents/PlanInformation/PlanInformation'),
)
const Banner = dynamic(() => import('../../components/Banner/Banner'))
const Accordion = dynamic(() =>
	import('../../components/Shared/Accordion/Accordion').then(
		(module) => module['Accordion'],
	),
)
const AccordionItem = dynamic(() =>
	import('../../components/Shared/Accordion/Accordion').then(
		(module) => module['AccordionItem'],
	),
)
const IDCards = dynamic(
	() => import('../../components/HomeComponents/IDCards/IDCards'),
)
const Button = dynamic(() => import('../../components/Shared/Button/Button'))

//* Begin Page component
const Page = (pageProps: any) => {
	const IS_DEV = process.env.NODE_ENV === 'development'

	//* start and end date for claims query input
	const claimsEndDate = withoutTime(new Date())
	const claimsStartDate = withoutTime(
		new Date(new Date().setMonth(claimsEndDate.getMonth() - 24)),
	)

	const { user } = useAuth0()
	const router = useRouter()

	//* reference to /InsurancePlan/<resource_id>
	const [insurancePlanRef, setInsurancePlanRef] = useState<string>('')

	//* reference to /Patient/<resource_id>
	const [patientRef, setPatientRef] = useState<string>('')

	//* Claim number state variable used to retrieve the EOB PDF - Per EOB link clicked
	const [claimNumberForEobCall, setClaimNumberForEobCall] = useState<string>('')

	//* State variables used for BO2 request
	const [dentalBookletReqBodyBO2, setDentalBookletReqBodyBO2] =
		useState<BenefitBookletReqBody>()
	const [visionBookletReqBodyBO2, setVisionBookletReqBodyBO2] =
		useState<BenefitBookletReqBody>()

	//* zustand state
	const storedMedicalBooklet =
		useMemberDataStore.use.legacy().benefitMedicalBooklet
	const storedVisionBooklet =
		useMemberDataStore.use.legacy().benefitVisionBooklet
	const storedDentalBooklet =
		useMemberDataStore.use.legacy().benefitDentalBooklet
	const storedSbcBooklet = useMemberDataStore.use.legacy().benefitSBCBooklet
	const storedCoverageBundle = useMemberDataStore.use.hapiFhir().coverageBundle
	const storedPatientBundle = useMemberDataStore.use.hapiFhir().patientBundle
	const storedMemberPlan = useMemberDataStore.use.memberPlan()
	const storedClaimsSummary = useMemberDataStore.use.hapiFhir().claimsSummary
	const storedEobPdf = useMemberDataStore.use.hapiFhir().eobPdf

	//* zustand state setters
	const setMedicalBooklet = useMemberDataStore.use.actions().setMedicalBooklet
	const setVisionBooklet = useMemberDataStore.use.actions().setVisionBooklet
	const setDentalBooklet = useMemberDataStore.use.actions().setDentalBooklet
	const setSbcBooklet = useMemberDataStore.use.actions().setSbcBooklet
	const setCoverageBundle = useMemberDataStore.use.actions().setCoverageBundle
	const setPatientBundle = useMemberDataStore.use.actions().setPatientBundle
	const setMemberPlan = useMemberDataStore.use.actions().setMemberPlan
	const setClaimsSummary = useMemberDataStore.use.actions().setClaimsSummary
	const setEobPdf = useMemberDataStore.use.actions().setEobPdf

	//* We need the context from the API to retrieve the planIdentifier from the idToken
	const context = trpc.context.getContext.useQuery({}, { ...skipBatchArgs })

	//* HAPI FHIR queries
	const coverageBundle = trpc.m360.searchCoverage.useQuery(undefined, {
		enabled: !storedCoverageBundle && !!storedMemberPlan.memberIdentifier,
		...skipBatchArgs,
	})

	const insurancePlan = trpc.m360.getInsurancePlan.useQuery(insurancePlanRef, {
		...skipBatchArgs,
		enabled: !!insurancePlanRef,
	})
	const patient = trpc.m360.getPatient.useQuery(patientRef, {
		...skipBatchArgs,
	})
	const patientBundle = trpc.m360.searchPatients.useQuery(
		{
			identifier: (() => {
				if (storedMemberPlan.isMedicaid && storedMemberPlan.maxisId)
					return storedMemberPlan.maxisId
				else return storedMemberPlan.memberIdentifier
			})(),
		},
		{
			enabled:
				!storedPatientBundle &&
				((!storedMemberPlan.isMedicaid &&
					!!storedMemberPlan?.memberIdentifier) ||
					(storedMemberPlan.isMedicaid && !!storedMemberPlan.maxisId)),
			...skipBatchArgs,
		},
	)
	// --- EOB Claims
	const claimsSummary = trpc.m360.claimsSummary.useQuery(
		{
			subscriberId: storedMemberPlan.memberIdentifier,
			isMedicaid: storedMemberPlan.isMedicaid,
		},
		{
			enabled:
				!storedClaimsSummary &&
				!!storedMemberPlan.memberIdentifier &&
				storedMemberPlan.isMedicaid !== undefined,
			...skipBatchArgs,
		},
	)
	// --- EOB PDF
	const eobPdf = trpc.m360.eobPdf.useQuery(
		{ claimNumber: claimNumberForEobCall },
		{
			enabled: !!storedClaimsSummary && !!claimNumberForEobCall,
			...skipBatchArgs,
		},
	)

	//* Drupal queries
	const banners = trpc.drupal.getBannerInfo.useQuery(
		{
			active: true,
			groupId: storedMemberPlan?.groupNumber,
		},
		{
			...skipBatchArgs,
		},
	)

	const benefitMedicalBooklet =
		trpc.benefitDocuments.getBenefitBookletMedical.useQuery(
			{
				memberPlan: storedMemberPlan,
			},
			{
				enabled: !storedMedicalBooklet && !!storedMemberPlan,
				...skipBatchArgs,
			},
		)
	const benefitDentalBooklet =
		trpc.benefitDocuments.getBenefitBookletDental.useQuery(
			{
				benefitBookletReqBody: dentalBookletReqBodyBO2,
			},
			{
				enabled: !storedDentalBooklet && !!dentalBookletReqBodyBO2,
				...skipBatchArgs,
			},
		)
	const benefitVisionBooklet =
		trpc.benefitDocuments.getBenefitBookletVision.useQuery(
			{
				benefitBookletReqBody: visionBookletReqBodyBO2,
			},
			{
				enabled: !storedVisionBooklet && !!visionBookletReqBodyBO2,
				...skipBatchArgs,
			},
		)
	const benefitSBCBooklet = trpc.benefitDocuments.getSBC.useQuery(
		{},
		{ enabled: !storedSbcBooklet, ...skipBatchArgs },
	)

	/**
	 * Maps Drupal banners to their location on page
	 *
	 * @param location Drupal banner CSS location styling
	 * @returns Array of Drupal banners
	 */
	const filterAndDisplayBanners = (location: DrupalBanner['location']) => {
		if (!banners.data || !banners?.data.length) return
		return banners.data.reduce(
			(accumulator: JSX.Element[], currentBanner: DrupalBanner) => {
				if (currentBanner.location === location) {
					const bannerJSX = (
						<Banner
							type={currentBanner.type}
							title={currentBanner.title}
							message={currentBanner.message}
							format={currentBanner.format}
						/>
					)
					accumulator.push(bannerJSX)
				}

				return accumulator
			},
			[] as JSX.Element[],
		)
	}

	//* check for query errors and log them
	context.isError && console.warn('Failed to fetch the context', context.error)
	coverageBundle.isError &&
		console.warn(
			'Failed to fetch M360 Coverage resource.',
			coverageBundle.error,
		)
	patientBundle.isError &&
		console.warn('Failed to fetch M360 Patient bundle.', patientBundle.error)
	claimsSummary.isError &&
		console.warn('Failed to fetch M360 Claim Summary.', claimsSummary.error)
	benefitMedicalBooklet.isError &&
		console.warn(
			'Failed to fetch medical benefit booklet',
			benefitMedicalBooklet.error,
		)
	benefitVisionBooklet.isError &&
		console.warn(
			'Failed to fetch vision benefit booklet',
			benefitVisionBooklet.error,
		)
	benefitDentalBooklet.isError &&
		console.warn(
			'Failed to fetch dental benefit booklet',
			benefitDentalBooklet.error,
		)
	benefitSBCBooklet.isError &&
		console.warn('Failed to fetch SBC benefit booklet', benefitSBCBooklet.error)
	eobPdf.isError && console.warn('Failed to fetch M360 EOB PDF.', eobPdf.error)

	//* store benefit booklets in zustand
	useEffect(() => {
		benefitMedicalBooklet.isSuccess &&
			setMedicalBooklet(benefitMedicalBooklet.data)
		benefitVisionBooklet.isSuccess &&
			setVisionBooklet(benefitVisionBooklet.data)
		benefitDentalBooklet.isSuccess &&
			setDentalBooklet(benefitDentalBooklet.data)
		benefitSBCBooklet.isSuccess && setSbcBooklet(benefitSBCBooklet.data)
	}, [
		benefitMedicalBooklet.isSuccess,
		benefitVisionBooklet.isSuccess,
		benefitDentalBooklet.isSuccess,
		benefitSBCBooklet.isSuccess,
		benefitMedicalBooklet.data,
		benefitVisionBooklet.data,
		benefitDentalBooklet.data,
		benefitSBCBooklet.data,
		setMedicalBooklet,
		setVisionBooklet,
		setDentalBooklet,
		setSbcBooklet,
	])

	//* store HAPI FHIR resources in zustand
	useEffect(() => {
		coverageBundle.isSuccess && setCoverageBundle(coverageBundle.data)
	}, [coverageBundle.isSuccess, coverageBundle.data, setCoverageBundle])

	//* Store M360 patientBundle to Zustand
	useEffect(() => {
		patientBundle.isSuccess && setPatientBundle(patientBundle.data)
	}, [patientBundle.isSuccess, patientBundle.data, setPatientBundle])

	//* Store M360 claimsSummary to Zustand
	useEffect(() => {
		claimsSummary.isSuccess && setClaimsSummary(claimsSummary.data)
	}, [claimsSummary.isSuccess, claimsSummary.data, setClaimsSummary])

	//* Store M360 EOB PDF to Zustand and open it in a new tab
	useEffect(() => {
		eobPdf.isSuccess && setEobPdf(eobPdf.data)
		// Open the EOB PDF URL in a new tab
		eobPdf.data &&
			window.open(
				URL.createObjectURL(
					b64toBlob(eobPdf.data?.base64EncodedPDF, 'application/pdf'),
				),
				'_blank',
			)
	}, [eobPdf.isSuccess, eobPdf.data, setEobPdf])

	//* Parse coverages and build the MemberPlan
	useEffect(() => {
		if (!storedCoverageBundle || !storedCoverageBundle.entry) return

		let selectedCoverage: Coverage | undefined = undefined
		let _isMedicaid = false
		let isMshoUser = false
		let maxisId: string | undefined = undefined

		storedCoverageBundle.entry.some((entry) => {
			const currentCoverage = entry?.resource as Coverage
			const mshoClass = currentCoverage?.class?.filter((cl) => {
				if (cl?.value?.value?.startsWith('MSHO')) {
					const codingFilter = cl?.type?.coding?.filter((coding) => {
						return (
							coding?.code === COVERAGE_CLASS_CODES.PLAN &&
							coding?.system?.endsWith(COVERAGE_CLASS_SYSTEM.COVERAGE_CLASS)
						)
					})

					return codingFilter &&
						codingFilter?.length &&
						codingFilter.length >= 1
						? true
						: false
				}
			})

			if (mshoClass?.length && mshoClass.length >= 1) isMshoUser = true

			// Skip if the resource ID does not match the selected coverage resource from plan-select.
			// The selected plan resource ID is found in the identity token, retrieved from the context API
			if (
				!entry.resource ||
				!entry.resource.id ||
				context.data?.planIdentifier !== entry.resource.id.trim()
			)
				return

			if (!selectedCoverage) selectedCoverage = currentCoverage

			//* Uncomment this if M360 Coverage APIs are down or you need to test different EPIDs while disregarding plan-select
			// if (
			// 	!selectedCoverage?.type?.coding ||
			// 	selectedCoverage?.type?.coding[0]?.code !== 'HIP'
			// ) {
			// 	return
			// }

			// Set the insurance plan resource reference and determine if Medicaid
			const insurancePlan = selectedCoverage.insurancePlan?.reference
			if (insurancePlan) {
				setInsurancePlanRef(insurancePlan)
				_isMedicaid = insurancePlan.includes('-f')
			}

			// If mediciad set Maxis-ID
			if (_isMedicaid) {
				maxisId = patient.data?.identifier?.find((id: { system: string }) =>
					id?.system?.endsWith('CodeSystem/maxis-id'),
				)?.value
			}

			//! TODO: This needs to be fixed in the Member360FHIR spec in the Hapi FHIR repo
			// eslint-disable-next-line
			// @ts-ignore
			const _patient = selectedCoverage.subscriber?.reference
			if (_patient) setPatientRef(_patient)

			if (isMshoUser && selectedCoverage) return true
		})

		//* Parse and set the member's plan
		if (selectedCoverage && patient.isSuccess) {
			setMemberPlan(
				parseMemberPlanFromCoverage(
					insurancePlan?.data?.plan,
					patient.data,
					selectedCoverage,
					_isMedicaid,
					isMshoUser,
					maxisId,
					insurancePlan?.data?.network,
				),
			)
		}
	}, [
		storedCoverageBundle,
		insurancePlan.data,
		patient.isSuccess,
		patient.data,
		setMemberPlan,
		context.data,
	])

	/**
	 * Build the request body for BO2 and update the appropriate state variables.
	 * Per the requirements, the user still needs to access their dental and vision PDFs even though
	 * they have selected Medical on the plan select page, thus using the coverage bundle to determine the appropriate
	 * group number, and coverage start/end date (dental vs vision vs medical).
	 */
	useEffect(() => {
		if (storedCoverageBundle && storedMemberPlan) {
			// --- Build Benefit Booklet Req Body for BO2
			setDentalBookletReqBodyBO2(
				buildBenefitBookletReqBodyBO2(
					storedMemberPlan,
					storedCoverageBundle,
					'dental',
				),
			)
			setVisionBookletReqBodyBO2(
				buildBenefitBookletReqBodyBO2(
					storedMemberPlan,
					storedCoverageBundle,
					'vision',
				),
			)

			// --- More BO2 req body builds
		}
	}, [storedCoverageBundle, storedMemberPlan])

	const handleOnClickEobLink = (claimNumber: string) => {
		// --- Check if the user previously used a particular claimNumber to request the EOB PDF. If so, open the PDF in a new tab using the storedEobPdf already in Zustand
		if (claimNumberForEobCall && claimNumberForEobCall === claimNumber) {
			storedEobPdf &&
				window.open(
					URL.createObjectURL(
						b64toBlob(storedEobPdf.base64EncodedPDF, 'application/pdf'),
					),
					'_blank',
				)
			return
		}
		// --- If the user request an EOB PDF with a different claimNumber (Per EOB link click), update the claimNumberForEobCall state variable and perform a new EOB PDF API call
		setClaimNumberForEobCall(claimNumber)
	}

	// if the member is an Engen member, show the loading spinner while we are redirecting them to the contact-information page
	if (redirectEngenMember(user, router)) return <LoadingSpinner />
	else
		return (
			<div className="mx-auto w-11/12 md:w-auto md:px-10">
				<Head>
					<title>Plan Information | Blue Cross Blue Shield of Minnesota</title>
				</Head>
				{/* memberInfo and coverageBundle are the most important, we can let the others load in */}
				{(!storedCoverageBundle || coverageBundle.isLoading) && (
					<div className="md:pb-16">
						<LoadingSpinner />
					</div>
				)}
				{storedMemberPlan && (
					<>
						{banners.data && filterAndDisplayBanners('top')}
						{/* TODO: replace planProgress, coverageSummary, and benefit booklets with M360 */}
						{((coverageBundle.isError || storedCoverageBundle?.total === 0) && (
							<TechnicalIssue
								containerStyle="border-#CCCCCC flex border bg-white md:mx-[48px]"
								errorCode={coverageBundle.error?.shape?.code}
							/>
						)) || (
							<PlanInformation
								benefitBookletMedical={storedMedicalBooklet}
								benefitBookletDental={storedDentalBooklet}
								benefitBookletVision={storedVisionBooklet}
								benefitSBCBooklet={storedSbcBooklet}
								memberPlan={storedMemberPlan}
							/>
						)}
						<Accordion
							styleClass={{
								border: 'border-none',
							}}
						>
							{((coverageBundle.isError ||
								storedCoverageBundle?.total === 0) && (
								<TechnicalIssue
									containerStyle="border-#CCCCCC flex border bg-white md:mx-[48px]"
									errorCode={coverageBundle.error?.shape?.code}
								/>
							)) || (
								<AccordionItem
									headerText="View ID Cards"
									rounded
									styleClass={{
										backgroundColorClosed: 'bg-LightGray',
										backgroundColorOpen: 'bg-LightBlue',
										border: 'border-none',
										headingPadding: 'px-[30px] py-[12px]',
									}}
									openHeight={9999}
								>
									{storedMemberPlan.dependent !== '' &&
										storedMemberPlan.maxisId !== '' &&
										storedPatientBundle &&
										patient.data && (
											<IDCards
												planData={storedMemberPlan}
												patients={filterIdCardPatients(
													patient.data,
													storedPatientBundle,
													storedMemberPlan,
												)}
											/>
										)}
								</AccordionItem>
							)}
							{banners.data && filterAndDisplayBanners('middle')}
							{((coverageBundle.isError ||
								storedCoverageBundle?.total === 0) && (
								<TechnicalIssue
									containerStyle="border-#CCCCCC flex border bg-white md:mx-[48px]"
									errorCode={coverageBundle.error?.shape?.code}
								/>
							)) || (
								<AccordionItem
									headerText="View Claims"
									rounded
									styleClass={{
										backgroundColorClosed: 'bg-LightGray',
										backgroundColorOpen: 'bg-LightBlue',
										border: 'border-none',
										headingPadding: 'px-[30px] py-[12px]',
										margin: 'mt-[16px]',
									}}
									openHeight={9999}
								>
									<div
										className={`mx-auto border-t border-transparent bg-LightBlue px-8 pb-8`}
									>
										{/* Loading spinner while loading claims */}
										{(!storedClaimsSummary || claimsSummary.isLoading) && (
											<LoadingSpinner />
										)}
										{claimsSummary.isError && (
											<div className="mb-16 flex">
												<TechnicalIssue
													containerStyle="border-PrimaryBlue flex border bg-LightBlue md:mx-[48px]"
													errorCode={claimsSummary.error?.shape?.code}
												/>
											</div>
										)}
										{storedClaimsSummary && storedMemberPlan && (
											<ClaimList
												enableFilter={false}
												claimsSummaryList={storedClaimsSummary}
												onClick={handleOnClickEobLink}
												eobPdfIsFetching={eobPdf.isFetching}
												eobPdfIsError={eobPdf.isError}
												isMedicaid={storedMemberPlan.isMedicaid}
											/>
										)}
										<div className="mt-5 flex justify-center pt-2.5">
											<Button
												type="button"
												handleClick={() => router.push('/claims')}
												label="View all claims"
												variant="primary"
											/>
										</div>
									</div>
								</AccordionItem>
							)}
						</Accordion>
					</>
				)}
				{banners.data && filterAndDisplayBanners('end')}
			</div>
		)
}

export default withAuthenticationRequired(Page)
