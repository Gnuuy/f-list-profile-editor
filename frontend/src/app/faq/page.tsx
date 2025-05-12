'use client'

import Collapsible from "../components/Collapsible"
import QuoteBlock from "../components/QuoteBlock"
import PageLayout from "../views/PageLayout"

export default function FAQ()
{
    return (
        <PageLayout sideBarChildren=
        {
            <div>
                Sani is so round
            </div>
        } mainBarChildren=
        {
            <div>
                <QuoteBlock />
                <br />
                <br />
            </div>
        }>
        </PageLayout>
    )
}