const { ethers } = require("ethers");
//const prompt = require('prompt-sync')({sigint: true});
const secret = require("./secret.json");
const config = require("./config.json");
const fs = require("fs");
const rewardLookup = require("./rewards.json");
const QuestAbi = require("./abi.json");


const gasPrice = ethers.utils.parseUnits('6','gwei');
const gas = {
    gasPrice: gasPrice,
    gasLimit: 20000000
}

async function main() {
    try{
        const DFKprovider = new ethers.providers.JsonRpcProvider("https://subnets.avax.network/defi-kingdoms/dfk-chain/rpc");
        const signer = DFKprovider.getSigner();

        questContract = new ethers.Contract(
            config.questContract,
            QuestAbi,
            DFKprovider
        );
        
        const DFKwallet = new ethers.Wallet(secret.wallet.private_key, DFKprovider);
        console.log("\nRecherche du stamina");
        const Stamina = await questContract.getCurrentStamina(1000000183399);
        const OngoingQuest = await questContract.getAccountActiveQuests(secret.wallet.public_key);
        console.log(`Quantité de stamina : ${Number(Stamina)}`);
        if (Stamina >= 25 && OngoingQuest[0] == null){
            console.log("Les Héros ont assez de stamina, lancement des quêtes.");
            const TimeStart = Math.round(Date.now() / 1000);
            await StartQuests(DFKwallet, config, gas);
            const TimeBegin = Math.round(Date.now() / 1000);
            while(1){
                let ActiveQuest = await questContract.getAccountActiveQuests(secret.wallet.public_key);
                sleep(20000);
                const TimeBeforeEndQuest = Number(ActiveQuest[5][ActiveQuest[5].length-3]);
                var Time = Math.round(Date.now() / 1000);
                sleep(1000);
                console.log(`Les quêtes ont commencé il y a ${Math.floor((Time-TimeBegin)/60)} minute(s).`);
                if (TimeBeforeEndQuest<=Time){
                    const LogComplete = await CompleteQuests(DFKwallet, config, gas);
                    console.log(LogComplete);
                    //let RewardEvents = LogComplete.logs[0];
                    //writeJsonFile("./Log.json",RewardEvents);
                    /*let RewardEvents = LogComplete.events.filter((e) => e.event === "QuestReward");
                    RewardEvents.forEach((result) => console.log(`${result.args.itemQuantity} x ${getRewardDescription(result.args.rewardItem)}`));*/
                    break;
                }
                sleep(60000);
            }
            console.log(`Les quêtes ont été commencé après ${Math.floor((TimeBegin-TimeStart)/60)} minute(s). Les quêtes ont été terminé au bout de ${Math.floor((Time-TimeBegin)/60)} minute(s).`);
        }
        else{
            if (Stamina >= 25){
                let ActiveQuest = await questContract.getAccountActiveQuests(secret.wallet.public_key);
                var Time = Math.round(Date.now() / 1000);
                const TimeBeforeEndQuest = Number(ActiveQuest[5][ActiveQuest[5].length-3]);
                if (TimeBeforeEndQuest<=Time){
                    const LogComplete = await CompleteQuests(DFKwallet, config, gas);
                    writeJsonFile("./Log.json",LogComplete);
                    
                }
            }
            else{
                console.log("Il n'y a pas assez de Stamina pour commencer les quêtes.");
            }
        }
              
        setTimeout(() => main(), 600000);
        console.log("En attente pendant 10 minutes...");
    } catch(err){
        console.error(`Unable to run: ${err.message}`);
    }
}

function sleep(milliseconds) {
    const date = Date.now();
    let currentDate = null;
    do {
      currentDate = Date.now();
    } while (currentDate - date < milliseconds);
  }

async function StartQuests(DFKwallet, config, gas){
    const LogStart = await questContract.connect(DFKwallet).multiStartQuest(config.quests.contractAddress, config.quests.professionHeroes, config.professionMaxAttempts, config.quests.level, gas);
    await LogStart.wait();
}

async function CompleteQuests(DFKwallet, config, gas){
    const LogComplete = await questContract.connect(DFKwallet).multiCompleteQuest(config.quests.ChefGroupHeroes, gas);
    await LogComplete.wait();
    return LogComplete;
}

function writeFileAsync(file, data) {
    return new Promise((res, rej) => {
        fs.writeFile(file, data, 'utf8', (err) => {
            if (err) {
                return rej(err)
            }
            res(true)
        })
    })
}

async function writeJsonFile(file, data) {
    await writeFileAsync(file, JSON.stringify(data))
}

main();
