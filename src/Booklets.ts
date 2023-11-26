import PdfIcon from '../../../assets/pdfIcon.svg'
import { BenefitBookletOutput } from '../../../types/benefitBooklets'
import { LineOfBusiness } from '../../../types/enums'
import { MemberPlan } from '../../../types/memberPlans'
import Booklet from './Booklet'

export type BookletsProps = {
	memberPlan?: MemberPlan

	// The below are not always going to be present for every user.
	benefitBookletMedical?: BenefitBookletOutput
	benefitBookletDental?: BenefitBookletOutput
	benefitBookletVision?: BenefitBookletOutput
	benefitSBCBooklet?: BenefitBookletOutput
}

const Booklets = ({
	memberPlan,
	benefitBookletMedical,
	benefitBookletDental,
	benefitBookletVision,
	benefitSBCBooklet,
}: BookletsProps) => {
	// Added new logic to check if Date is between Oct15 and Dec31 to show Next Year Handbook
	const today = new Date()
	const currentYear = today.getFullYear()
	const oct15CurrentYear = new Date(currentYear, 9, 15)
	const dec31CurrentYear = new Date(currentYear, 11, 31)
	const isDateBetweenOct15AndDec31 =
		today >= oct15CurrentYear && today <= dec31CurrentYear
	const currentYearStr = "" + currentYear
	const nextYearStr = "" + (currentYear + 1)
	// --- Render the Medicaid Benefit Booklet UI
	const medicaidBenefitBooklet = (isMedicaid: boolean, productId: string) => (
		<>
			<Booklet
				icon={PdfIcon}
				title={currentYearStr + " Member Handbook"}
				message="View your coverage details within this PDF."
				isMedicaid={isMedicaid}
				productId={productId}
				year="current"
			/>
			{/*
				Display Next Year Handbook, Only When Current date is between Oct 15 and Jan 1 
			*/}
			{isDateBetweenOct15AndDec31 && (
				<Booklet
					icon={PdfIcon}
					title={nextYearStr + " Member Handbook"}
					message="View your coverage details within this PDF."
					isMedicaid={isMedicaid}
					productId={productId}
					year="nextyear"
				/>
			)}
		</>
	)
	const isMedicalBooklet = (memberPlan?.lob === LineOfBusiness.medical &&
		benefitBookletMedical &&
		benefitBookletMedical.base64EncodedPDF)
	// --- Render the Commercial Benefit Booklets UI
	const commercialBenefitBooklet = () => (
		<>
			{benefitSBCBooklet && benefitSBCBooklet.base64EncodedPDF && (
				<Booklet
					icon={PdfIcon}
					pdf={benefitSBCBooklet.base64EncodedPDF}
					title="Summary of Benefits & Coverage"
					message="Explore the details of your plan and coverage."
				/>
			)}
			{isMedicalBooklet && (
						<Booklet
						icon={PdfIcon}
						pdf={benefitBookletMedical.base64EncodedPDF}
						title={"Medical Benefit Booklet " + currentYearStr}
						message="View all of your benefits within the benefit booklet."
						year={"current"}
					/>
			)}
			{/*
				Display Next Year Handbook, Only When Current date is between Oct 15 and Jan 1 
			*/}
			{isMedicalBooklet && isDateBetweenOct15AndDec31 && (
				<Booklet
					icon={PdfIcon}
					pdf={benefitBookletMedical.base64EncodedPDF}
					title={"Medical Benefit Booklet " + nextYearStr}
					message="View all of your benefits within the benefit booklet."
					year="nextyear"
				/>
			)}
			{memberPlan?.lob === LineOfBusiness.vision &&
				benefitBookletVision &&
				benefitBookletVision.base64EncodedPDF && (
					<Booklet
						icon={PdfIcon}
						pdf={benefitBookletVision.base64EncodedPDF}
						title="Vision Benefit Booklet"
						message="View all of your benefits within the benefit booklet."
					/>
				)}
			{memberPlan?.lob === LineOfBusiness.dental &&
				benefitBookletDental &&
				benefitBookletDental.base64EncodedPDF && (
					<Booklet
						icon={PdfIcon}
						pdf={benefitBookletDental.base64EncodedPDF}
						title="Dental Benefit Booklet"
						message="View all of your benefits within the benefit booklet."
					/>
				)}
		</>
	)

	return (
		<>
			<div className="grid-cols-3 md:mt-2 md:grid">
				{memberPlan?.isMedicaid
					? medicaidBenefitBooklet(memberPlan.isMedicaid, memberPlan.productId)
					: commercialBenefitBooklet()}
			</div>
		</>
	)
}

export default Booklets
