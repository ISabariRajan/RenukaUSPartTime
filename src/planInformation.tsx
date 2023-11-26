import { BenefitBookletOutput } from '../../../types/benefitBooklets'
import { MemberPlan } from '../../../types/memberPlans'
import PageTitle from '../../PageTitle/PageTitle'
import LoadingSpinner from '../../Shared/LoadingSpinner/LoadingSpinner'
import Booklets from '../Booklets/Booklets'
import PlanDetails from './PlanDetails'

export type PlanInformationProps = {
	// The below are not always going to be present for every user.
	benefitBookletMedical?: BenefitBookletOutput
	benefitBookletDental?: BenefitBookletOutput
	benefitBookletVision?: BenefitBookletOutput
	benefitSBCBooklet?: BenefitBookletOutput
	memberPlan?: MemberPlan
}

const PlanInformation = ({
	benefitBookletMedical,
	benefitBookletDental,
	benefitBookletVision,
	benefitSBCBooklet,
	memberPlan,
}: PlanInformationProps) => {
	return (
		<>
			{/* TODO: Need to conditionally display Medical/Vision/Dental in the mainPage text */}
			<div data-testid="plan-information-page-title">
				<PageTitle
					mainPage="Plan Information"
					subPage={`Welcome Back, ${memberPlan?.givenName ?? ''}`}
				/>
			</div>

			{/* TODO: Build a list of plan details for Dual Coverage */}
			{!memberPlan ? (
				<LoadingSpinner />
			) : (
				<div data-testid="plan-details">
					<PlanDetails memberPlan={memberPlan} />
				</div>
			)}

			<div className="mb-16 h-[0px] border border-stone-300" />

			<div data-testid="benefit-booklets">
				<Booklets
					memberPlan={memberPlan}
					benefitBookletMedical={benefitBookletMedical}
					benefitBookletDental={benefitBookletDental}
					benefitBookletVision={benefitBookletVision}
					benefitSBCBooklet={benefitSBCBooklet}
				/>
			</div>
		</>
	)
}

export default PlanInformation
