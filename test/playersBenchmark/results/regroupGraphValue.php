<?php  
	//on récupère le contenu
	$fileLines = file('DashJsLog.txt');
	
	//transformation du fichier au format :
	// Line #, Weight (in view), TimeStamp
	// 1, 1,000000, 0,107919714
	// devra devenir 
	// 0.107919714 => 1,000000
	
	$result = array(0=>0);
	$previousTS = 0;
	
	//echo count($fileLines)."\n";
	
	for ($i = 1; $i < count($fileLines); $i++) {
		$values = explode(",", $fileLines[$i]);
		$currentW = floatval($values[1]).".".intval($values[2]);
		$currentTS = floatval($values[3]).".".intval($values[4]);
		//echo $currentTS." ; ".$currentW." \n";	
	
	
		//if (($previousTS + 0.0000001)<$currentTS) {
			// new value !
			$previousTS = $currentTS;
			$result["".$previousTS] = $currentW;
		//} else {
		//	$result["".$previousTS] += $currentW;
		//}
		
	}
	
	$fp = 'results.csv';
	if(!is_file($fp)){
		exit("Une erreure s'est produite à l'ouverture du fichier !");
	} else {
		$fp = fopen($fp, 'w');
	}
	
	foreach ($result as $key=>$value) {
		fputcsv($fp, array(str_replace(".", ",", $key),str_replace(".", ",", $value)),';');
	}
	fclose($fp);
	
	echo ('Transform '.count($fileLines).' lines to '.count($result).' lines !');

?>