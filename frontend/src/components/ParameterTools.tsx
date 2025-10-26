import { useTranslation } from "react-i18next";

type ParameterToolsProps = {
    message: string;
};

export const ParameterTools = ({message}: ParameterToolsProps) => {
    const { t } = useTranslation();

    function handleClick(){
        if(message == t('tools.startPoint')){
            console.log("should open a start point");
        }
        else{
            console.log("should open a destination");
        }
    }
    return(
        <div className="tool-card tool-card--stacked">
            <h3>{message}</h3>

            <button onClick={handleClick}>{t('tools.dropPin')}</button>
        </div>
    )
}
